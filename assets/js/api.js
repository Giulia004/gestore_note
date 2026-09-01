(function () {
    'use strict';

    window.GN_API = {
        fetch: function (url, options) {
            options = options || {};
            options.credentials = 'include';
            options.headers = Object.assign(
                {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': GN_Data.nonce,
                },
                options.headers || {}
            );

            return fetch(url, options).then(function (res) {
                if (!res.ok) {
                    return res.json().then(function (err) {
                        throw new Error(err.message || 'Errore API');
                    });
                }

                return res.json();
            });
        }
    };
})();