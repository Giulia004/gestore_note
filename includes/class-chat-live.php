<?php

if (!defined('ABSPATH')) {
    exit;
}

class Gestore_Note_Chat_Live
{
    const NS = 'gestore-note/v1';
    private static $instance = null;

    public static function get_instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct()
    {
        add_action('rest_api_init', [$this, 'registra_rotte_chat']);
    }

    public function registra_rotte_chat()
    {
        register_rest_route(self::NS, '/chat', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'get_messaggi_chat'],
            'permission_callback' => [$this, 'controllo_permessi_chat'],
        ]);

        register_rest_route(self::NS, '/chat', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'invia_messaggio_chat'],
            'permission_callback' => [$this, 'controllo_permessi_chat'],
        ]);
    }

    public function controllo_permessi_chat()
    {
        return is_user_logged_in() && current_user_can('edit_posts');
    }

    public function get_messaggi_chat()
    {
        $messaggi = get_option('gestore_note_chat_messaggi', []);
        return rest_ensure_response($messaggi);
    }

    public function invia_messaggio_chat($request)
    {
        $testo = sanitize_text_field($request->get_param('testo'));
        if (empty($testo))
            return new WP_Error('testo_vuoto', 'Il messaggio non può essere vuoto', ['status' => 400]);

        $current_user = wp_get_current_user();
        $messaggi = get_option('gestore_note_chat_messaggi', []);

        $nuovo_messaggio = [
            'autore' => $current_user->display_name,
            'testo' => $testo,
            'data' => current_time('H:i')
        ];

        $messaggi[] = $nuovo_messaggio;
        if (count($messaggi) > 50)
            array_shift($messaggi); // Mantieni solo gli ultimi 50 messaggi
        update_option('gestore_note_chat_messaggi', $messaggi);
        return rest_ensure_response($nuovo_messaggio);
    }
}

Gestore_Note_Chat_Live::get_instance();