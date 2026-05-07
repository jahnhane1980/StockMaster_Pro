/**
 * StockMaster HttpClient
 * Revealing Module Pattern
 * Ein generischer Wrapper um die native Fetch-API mit integriertem globalen Error-Handling.
 */
window.StockMaster = window.StockMaster || {};

window.StockMaster.HttpClient = (function() {
    
    let activeRequests = 0;

    function updateLoader(isLoading) {
        const loader = document.getElementById('top-loader');
        if (!loader) return;

        if (isLoading) {
            activeRequests++;
            loader.classList.add('active');
        } else {
            activeRequests--;
            if (activeRequests <= 0) {
                activeRequests = 0;
                loader.classList.remove('active');
            }
        }
    }

    async function request(endpoint, options = {}) {
        updateLoader(true);
        const config = {
            method: options.method || 'GET',
            // Default-Header entfernt, da er bei GET-Requests und file:/// URLs CORS-Preflights auslöst
            headers: { ...options.headers }
        };

        // Content-Type nur setzen, wenn wir auch wirklich einen Body mitsenden (z.B. bei POST)
        if (options.body) {
            config.headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(endpoint, config);

            // Prüfen auf HTTP-Fehler (4xx, 5xx)
            if (!response.ok) {
                handleHttpError(response);
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
            
        } catch (error) {
            // Fängt "harte" Netzwerkfehler ab (z.B. User ist offline oder CORS blockiert)
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                document.dispatchEvent(new CustomEvent(window.StockMaster.Events.GLOBAL_NOTIFICATION, {
                    detail: { type: 'error', message: 'Netzwerkfehler. Bitte Internetverbindung prüfen.' }
                }));
            }
            // Fehler weiterwerfen, falls der aufrufende Service noch lokal reagieren muss
            throw error; 
        } finally {
            updateLoader(false);
        }
    }

    // Zentrale Auswertung der Fehler-Codes
    function handleHttpError(response) {
        let errorMessage = 'Ein unbekannter API-Fehler ist aufgetreten.';
        
        if (response.status === 401 || response.status === 403) {
            errorMessage = 'Zugriff verweigert. Bitte überprüfe deinen API-Key.';
        } else if (response.status === 404) {
            errorMessage = 'Die angeforderte Ressource wurde nicht gefunden.';
        } else if (response.status === 429) {
            errorMessage = 'API-Ratenlimit erreicht. Bitte warte einen Moment.';
        } else if (response.status >= 500) {
            errorMessage = 'Der externe Server meldet ein Problem (5xx).';
        }

        // Globales Event an den NotificationService feuern
        document.dispatchEvent(new CustomEvent(window.StockMaster.Events.GLOBAL_NOTIFICATION, {
            detail: { type: 'error', message: errorMessage }
        }));
    }

    // Public API
    return {
        get: (url, headers) => request(url, { method: 'GET', headers }),
        post: (url, body, headers) => request(url, { method: 'POST', body, headers })
    };
})();