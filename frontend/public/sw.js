// sw.js — MindActions Service Worker
// Lives in frontend/public/ so Vite serves it at the root URL /sw.js
// This file runs in the background, separate from your React app.
// It handles two jobs:
//   1. Showing notifications with action buttons at reminder times
//   2. Handling what happens when the user taps those buttons

const CACHE_NAME = "mindactions-v1"

// ── INSTALL ──────────────────────────────────────────────────────────────────
// Runs once when the service worker is first registered.
// skipWaiting() makes the new SW take over immediately without waiting.
self.addEventListener("install", event => {
    console.log("[SW] Installing service worker")
    self.skipWaiting()
})

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
// Runs after install. clients.claim() makes this SW control all open tabs
// immediately, without waiting for a page reload.
self.addEventListener("activate", event => {
    console.log("[SW] Service worker activated")
    event.waitUntil(clients.claim())
})

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
// This is the most important handler.
// When the user taps a button inside the notification, this fires.
// event.action is the button's action string ("complete" or "snooze")
// event.notification.data carries the action_id we passed when showing the notification
self.addEventListener("notificationclick", event => {
    console.log("[SW] Notification clicked:", event.action)

    // Always close the notification first
    event.notification.close()

    const notifData = event.notification.data || {}
    const actionId = notifData.actionId

    if (event.action === "complete") {
        // User tapped "Action Complete" inside the notification.
        // We need to tell the React app to show the DifficultyPopup.
        // We do this by sending a message to all open app windows.
        event.waitUntil(
            clients.matchAll({ type: "window", includeUncontrolled: true })
                .then(windowClients => {
                    if (windowClients.length > 0) {
                        // App window is open — send it a message
                        windowClients[0].postMessage({
                            type: "NOTIFICATION_COMPLETE",
                            actionId: actionId,
                        })
                        windowClients[0].focus()
                    } else {
                        // App is not open — open it and pass the action via URL
                        return clients.openWindow("/?complete=" + actionId)
                    }
                })
        )

    } else if (event.action === "snooze") {
        // User tapped "Snooze" — show the notification again in 15 minutes
        const delayMs = 15 * 60 * 1000
        setTimeout(() => {
            self.registration.showNotification("Action Reminder — Snoozed", {
                body: event.notification.body,
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                data: notifData,
                actions: [
                    { action: "complete", title: "Action Complete" },
                    { action: "snooze", title: "Snooze 15 min" },
                ],
                requireInteraction: true,
            })
        }, delayMs)

    } else {
        // User tapped the notification body (not a button) — just open the app
        event.waitUntil(
            clients.matchAll({ type: "window" }).then(windowClients => {
                if (windowClients.length > 0) {
                    windowClients[0].focus()
                } else {
                    clients.openWindow("/")
                }
            })
        )
    }
})

// ── PUSH (server-sent notifications) ──────────────────────────────────────────
// This fires when the server sends a push notification.
// The payload is JSON with { title, body, actionId }.
self.addEventListener("push", event => {
    if (!event.data) return

    let data = {}
    try { data = event.data.json() } catch { data = { title: "MindActions", body: event.data.text() } }

    console.log("[SW] Push received:", data)

    event.waitUntil(
        self.registration.showNotification(data.title || "Action Reminder", {
            body: data.body || "Time to complete your action",
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            data: { actionId: data.actionId },
            actions: [
                { action: "complete", title: "Action Complete" },
                { action: "snooze", title: "Snooze 15 min" },
            ],
            requireInteraction: true,
        })
    )
})

// ── SCHEDULED NOTIFICATION HELPER ─────────────────────────────────────────────
// The app sends a message to the SW to schedule a future notification.
// This works even if the tab is closed, as long as the browser is running.
self.addEventListener("message", event => {
    if (event.data?.type === "SCHEDULE_NOTIFICATION") {
        const { delayMs, title, body, actionId } = event.data
        console.log(`[SW] Scheduling notification in ${delayMs}ms for action ${actionId}`)

        setTimeout(() => {
            self.registration.showNotification(title || "Action Reminder", {
                body: body || "Time for your action",
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                data: { actionId },
                actions: [
                    { action: "complete", title: "Action Complete" },
                    { action: "snooze", title: "Snooze 15 min" },
                ],
                requireInteraction: true,
                tag: `reminder-${actionId}`,  // prevents duplicate notifications
            })
        }, delayMs)
    }
})