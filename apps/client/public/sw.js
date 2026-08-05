self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    event.waitUntil(
        self.registration.showNotification(data.title || 'Maison CRM', {
            body: data.body || '',
            icon: '/shear-favicon.png',
        })
    );
});
