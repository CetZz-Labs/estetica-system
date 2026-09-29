self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    event.waitUntil(
        self.registration.showNotification(data.title || 'Shear', {
            body: data.body || '',
            icon: '/shear-favicon.png',
        })
    );
});
