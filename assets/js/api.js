(function () {
    'use strict';

    window.GN_API = {
        fetch: function (url, options) {
            options = options || {};
            options.credentials = 'include';
            options.headers = Object.assign(
                {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': typeof GN_Data !== 'undefined' && GN_Data.nonce ? GN_Data.nonce : '',
                },
                options.headers || {}
            );

            return fetch(url, options).then(async function (res) {
                var rawText = await res.text();
                var data = null;

                if (rawText) {
                    try {
                        data = JSON.parse(rawText);
                    } catch (e) {
                        throw new Error(rawText.substring(0, 180) || 'Errore API');
                    }
                }

                if (!res.ok) {
                    var msg = 'Errore API';
                    if (data && data.message) {
                        msg = data.message;
                    } else if (data && data.error) {
                        msg = data.error;
                    }
                    throw new Error(msg);
                }

                return data;
            });
        }
    };
})();