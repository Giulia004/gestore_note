<?php
if (!defined('ABSPATH')) {
    exit;
}

class Gestore_Note_Rest_Api
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
        add_action('rest_api_init', [$this, 'registra_rotte']);
    }

    public function gestione_cors()
    {
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: POST,GET,OPTIONS,PUT,DELETE");
        header("Access-Control-Allow-Headers: Origin,Authorization, X-Requested-With, Content-Type, Accept");

        if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
            status_header(200);
            exit();
        }
    }

    public function controllo_permessi()
    {
        return is_user_logged_in() && current_user_can('edit_posts');
    }
    public function controllo_permessi_singola_nota($request)
    {
        $post_id = absint($request['id']);
        if (!get_post($post_id))
            return false;
        return is_user_logged_in() && current_user_can('edit_post', $post_id);
    }

    public function registra_rotte()
    {
        register_rest_route(self::NS, '/users', [
            'methods' => 'GET',
            'callback' => [$this, 'get_utenti'],
            'permission_callback' => [$this, 'controllo_permessi']
        ]);

        //Endpoint per il recupero delle etichette (tag)
        register_rest_route(self::NS, '/tag', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_tag'],
                'permission_callback' => [$this, 'controllo_permessi']
            ],
            [
                'methods' => 'POST',
                'callback' => [$this, 'crea_tag'],
                'permission_callback' => [$this, 'controllo_permessi']
            ]
        ]);

        register_rest_route(self::NS, '/categoria', [
            'methods' => 'POST',
            'callback' => [$this, 'crea_categoria'],
            'permission_callback' => [$this, 'controllo_permessi']
        ]);

        register_rest_route(self::NS, '/categoria/(?P<id>\d+)', [
            'methods' => 'PUT',
            'callback' => [$this, 'aggiorna_categoria'],
            'permission_callback' => [$this, 'controllo_permessi']
        ]);

        register_rest_route(self::NS, '/note', [
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_note'],
                'permission_callback' => [$this, 'controllo_permessi'],
            ],
            [
                'methods' => 'POST',
                'callback' => [$this, 'crea_nota'],
                'permission_callback' => [$this, 'controllo_permessi'],
            ],
        ]);

        register_rest_route(self::NS, '/note/(?P<id>\d+)/allegato', [
            'methods' => 'POST',
            'callback' => [$this, 'carica_allegato'],
            'permission_callback' => [$this, 'controllo_permessi_singola_nota'],
        ]);

        //Rotta per la gestione della singola nota (eliminazione e modifica)
        register_rest_route(self::NS, '/note/(?P<id>\d+)', [
            [
                'methods' => 'PUT',
                'callback' => [$this, 'aggiorna_nota'],
                'permission_callback' => [$this, 'controllo_permessi_singola_nota'],
            ],
            [
                'methods' => 'DELETE, POST',
                'callback' => [$this, 'elimina_nota'],
                'permission_callback' => [$this, 'controllo_permessi_singola_nota'],
            ],
        ]);

        register_rest_route(self::NS, '/note/(?P<id>\d+)/commenti', [
            [
                'methods' => 'POST',
                'callback' => [$this, 'aggiungi_commento'],
                'permission_callback' => [$this, 'controllo_permessi_singola_nota']
            ],
        ]);
    }

    public function carica_allegato($request)
    {
        $post_id = absint($request['id']);

        if (!empty($_FILES['file'])) {
            require_once(ABSPATH . 'wp-admin/includes/file.php');
            require_once(ABSPATH . 'wp-admin/includes/media.php');
            require_once(ABSPATH . 'wp-admin/includes/image.php');

            $attachment_id = media_handle_upload('file', $post_id);

            if (is_wp_error($attachment_id)) {
                return $attachment_id;
            }

            update_post_meta($post_id, '_nota_allegato_id', $attachment_id);
            return rest_ensure_response([
                'success' => true,
                'id' => $attachment_id,
                'url' => wp_get_attachment_url($attachment_id)
            ]);
        }
        return new WP_Error('no_file', 'Nessun file caricato', ['status' => 400]);
    }

    public function aggiungi_commento($request)
    {
        $post_id = absint($request['id']);
        if (!get_post($post_id)) {
            return new WP_Error('nota_non_trovata', 'Nota non trovata.', ['status' => 404]);
        }

        $testo_commento = sanitize_textarea_field($request->get_param('testo'));
        if (empty($testo_commento)) {
            return new WP_Error('commento_vuoto', 'Il testo del commento è obbligatorio.', ['status' => 400]);
        }

        $current_user = wp_get_current_user();

        $commenti = get_post_meta($post_id, '_nota_commenti', true);
        if (!is_array($commenti))
            $commenti = [];

        $nuovo_commento = [
            'id' => time(),
            'autor_id' => $current_user->ID,
            'autore' => $current_user->display_name,
            'testo' => $testo_commento,
            'data' => current_time('mysql'),
        ];

        $commenti[] = $nuovo_commento;
        update_post_meta($post_id, '_nota_commenti', $commenti);

        return rest_ensure_response($nuovo_commento);
    }

    public function crea_categoria($request)
    {
        $nome = trim(sanitize_text_field($request->get_param('nome')));

        if (empty($nome)) {
            return new WP_Error('categoria_vuota', 'Il nome della categoria è obbligatorio.', ['status' => 400]);
        }

        if (!taxonomy_exists('categoria_nota')) {
            return new WP_Error('categoria_non_registrata', 'La tassonomia categoria non è registrata.', ['status' => 500]);
        }

        $term = term_exists($nome, 'categoria_nota');
        $term_id = null;

        if ($term) {
            $term_id = is_array($term) ? $term['term_id'] : $term;
            $term_obj = get_term($term_id, 'categoria_nota');
        } else {
            $inserita = wp_insert_term($nome, 'categoria_nota');
            if (is_wp_error($inserita)) {
                return $inserita;
            }
            $term_id = $inserita['term_id'];
        }

        $utenti = array_map('absint', (array) $request->get_param('utenti'));
        $utenti = array_values(array_unique(array_filter($utenti, function ($id) {
            return $id > 0;
        })));

        if (!empty($utenti)) {
            update_term_meta($term_id, '_categoria_utenti', $utenti);
        } else {
            delete_term_meta($term_id, '_categoria_utenti');
        }

        $term_obj = get_term($term_id, 'categoria_nota');
        return rest_ensure_response([
            'id' => $term_id,
            'name' => $term_obj ? $term_obj->name : $nome,
            'utenti' => $utenti,
        ]);
    }

    public function aggiorna_categoria($request)
    {
        $term_id = absint($request['id']);
        $nome = trim(sanitize_text_field($request->get_param('nome')));

        if (!$term_id || !term_exists($term_id, 'categoria_nota')) {
            return new WP_Error('categoria_non_trovata', 'Categoria non trovata.', ['status' => 404]);
        }

        if (empty($nome)) {
            return new WP_Error('categoria_vuota', 'Il nome della categoria è obbligatorio.', ['status' => 400]);
        }

        $term = wp_update_term($term_id, 'categoria_nota', [
            'name' => $nome,
        ]);

        if (is_wp_error($term)) {
            return $term;
        }

        $utenti = array_map('absint', (array) $request->get_param('utenti'));
        $utenti = array_values(array_unique(array_filter($utenti, function ($id) {
            return $id > 0;
        })));

        if (!empty($utenti)) {
            update_term_meta($term_id, '_categoria_utenti', $utenti);
        } else {
            delete_term_meta($term_id, '_categoria_utenti');
        }

        return rest_ensure_response([
            'id' => $term_id,
            'name' => $nome,
            'utenti' => $utenti,
        ]);
    }

    public function crea_tag($request)
    {
        $nome = trim(sanitize_text_field($request->get_param('nome')));

        if (empty($nome)) {
            return new WP_Error('tag_vuoto', 'Il nome dell\'etichetta è obbligatorio.', ['status' => 400]);
        }

        if (!taxonomy_exists('tag_nota')) {
            return new WP_Error('tag_non_registrata', 'La tassonomia etichetta non è registrata.', ['status' => 500]);
        }

        $term = term_exists($nome, 'tag_nota');
        if ($term) {
            $term_id = is_array($term) ? $term['term_id'] : $term;
            $term_obj = get_term($term_id, 'tag_nota');
            return rest_ensure_response([
                'id' => $term_id,
                'name' => $term_obj ? $term_obj->name : $nome,
            ]);
        }

        $inserita = wp_insert_term($nome, 'tag_nota');
        if (is_wp_error($inserita)) {
            return $inserita;
        }

        return rest_ensure_response([
            'id' => $inserita['term_id'],
            'name' => $nome,
        ]);
    }

    public function get_note()
    {
        $note = get_posts([
            'post_type' => 'wp_nota_interna',
            'post_status' => 'publish',
            'posts_per_page' => -1,
        ]);
        return rest_ensure_response(array_map([$this, 'formatta_nota'], $note));
    }

    private function get_utenti_abilitati_per_categoria($categoria_ids)
    {
        $lista = [];
        $categoria_ids = (array) $categoria_ids;

        foreach ($categoria_ids as $categoria_id) {
            $categoria_id = absint($categoria_id);
            if (!$categoria_id) {
                continue;
            }

            $utenti = get_term_meta($categoria_id, '_categoria_utenti', true);
            $utenti = is_array($utenti) ? $utenti : [];
            $lista = array_merge($lista, array_map('absint', $utenti));
        }

        return array_values(array_unique($lista));
    }

    private function assegna_utente_da_categoria($post_id, $request)
    {
        $categoria_ids = $request->get_param('categoria_nota');
        if (!empty($categoria_ids)) {
            $cat_id = absint(is_array($categoria_ids) ? $categoria_ids[0] : $categoria_ids);
            wp_set_object_terms($post_id, [$cat_id], 'categoria_nota');

            //Recupero dell'utente associato ai metadati della categoria
            $utente_categoria = get_term_meta($cat_id, '_categoria_utente_id', true);
            if ($utente_categoria) {
                update_post_meta($post_id, '_nota_assegnato_a', absint($utente_categoria));
                return absint($utente_categoria);
            }

            return null;
        }
    }

    public function crea_nota($request)
    {
        $titolo = sanitize_text_field($request->get_param('titolo'));

        if (empty($titolo)) {
            return new WP_Error('nota_senza_titolo', 'Il titolo è obbligatorio.', ['status' => 400]);
        }

        $post_id = wp_insert_post([
            'post_type' => 'wp_nota_interna',
            'post_title' => $titolo,
            'post_content' => sanitize_textarea_field($request->get_param('contenuto')),
            'post_status' => 'publish',
        ], true);

        if (is_wp_error($post_id))
            return $post_id;

        update_post_meta($post_id, '_nota_stato', 'todo');
        update_post_meta($post_id, '_nota_priorita', sanitize_key($request->get_param('priorita') ?: 'media'));
        update_post_meta($post_id, '_nota_scadenza', sanitize_text_field($request->get_param('scadenza')));

        //Assegnazione dell'utente
        $assegnato_a = absint($request->get_param('assegnato_a'));
        $categoria_ids = array_filter(array_map('absint', (array) $request->get_param('categoria_nota')));
        $utenti_abilitati = $this->get_utenti_abilitati_per_categoria($categoria_ids);
        if ($assegnato_a && !empty($utenti_abilitati) && !in_array($assegnato_a, $utenti_abilitati, true)) {
            return new WP_Error('utente_non_abilitato', 'Questo utente non è abilitato per la categoria selezionata.', ['status' => 400]);
        }
        if ($assegnato_a) {
            update_post_meta($post_id, '_nota_assegnato_a', $assegnato_a);
        }

        // Gestione delle etichette (tag)
        $tag_ids = $request->get_param('tag_nota');
        if (!empty($tag_ids)) {
            $tag_ids = array_map('absint', (array) $tag_ids);
            wp_set_object_terms($post_id, $tag_ids, 'tag_nota');
        }

        // Sovrascrive o imposta l'assegnatario in base alla categoria scelta
        $utente_da_categoria = $this->assegna_utente_da_categoria($post_id, $request);
        $assegnato_finale = $utente_da_categoria ? $utente_da_categoria : $assegnato_a;

        if ($assegnato_finale) {
            delete_transient('gestore_note_widget_task_' . $assegnato_finale);
        }

        return rest_ensure_response($this->formatta_nota(get_post($post_id)));
    }

    public function aggiorna_nota($request)
    {
        $post_id = absint($request['id']);
        if (!get_post($post_id)) {
            return new WP_Error('nota_non_trovata', 'Nota non trovata.', ['status' => 404]);
        }

        $vecchio_assegnato = get_post_meta($post_id, '_nota_assegnato_a', true);

        $stato = $request->get_param('stato');
        if ($stato) {
            update_post_meta($post_id, '_nota_stato', sanitize_key($stato));
        }

        $titolo = $request->get_param('titolo');
        if ($titolo !== null) {
            wp_update_post([
                'ID' => $post_id,
                'post_title' => sanitize_text_field($titolo)
            ]);
            clean_post_cache($post_id);
        }

        $priorita = $request->get_param('priorita');
        if ($priorita !== null) {
            update_post_meta($post_id, '_nota_priorita', sanitize_key($priorita));
        }

        $scadenza = $request->get_param('scadenza');
        if ($scadenza !== null) {
            update_post_meta($post_id, '_nota_scadenza', sanitize_text_field($scadenza));
        }

        $assegnato_a = $request->get_param('assegnato_a');
        if ($assegnato_a !== null) {
            $assegnato_a_int = absint($assegnato_a);
            $categoria_ids = array_filter(array_map('absint', (array) $request->get_param('categoria_nota')));
            $utenti_abilitati = $this->get_utenti_abilitati_per_categoria($categoria_ids);
            if ($assegnato_a_int && !empty($utenti_abilitati) && !in_array($assegnato_a_int, $utenti_abilitati, true)) {
                return new WP_Error('utente_non_abilitato', 'Questo utente non è abilitato per la categoria selezionata.', ['status' => 400]);
            }
            update_post_meta($post_id, '_nota_assegnato_a', $assegnato_a_int);
        }

        $tag_ids = $request->get_param('tag_nota');
        if ($tag_ids !== null) {
            $tag_ids = array_map('absint', (array) $tag_ids);
            wp_set_object_terms($post_id, $tag_ids, 'tag_nota');
        }

        // Applica l'eventuale categoria e sovrascrive l'assegnatario associato
        $this->assegna_utente_da_categoria($post_id, $request);

        if ($vecchio_assegnato) {
            delete_transient('gestore_note_widget_task_' . $vecchio_assegnato);
        }

        $nuovo_assegnato = get_post_meta($post_id, '_nota_assegnato_a', true);
        if ($nuovo_assegnato && $nuovo_assegnato != $vecchio_assegnato) {
            delete_transient('gestore_note_widget_task_' . $nuovo_assegnato);
        }

        return rest_ensure_response($this->formatta_nota(get_post($post_id)));
    }

    public function elimina_nota($request)
    {
        $post_id = absint($request['id']);
        $assegnato_corrente = get_post_meta($post_id, '_nota_assegnato_a', true);

        if ($assegnato_corrente) {
            delete_transient('gestore_note_widget_task_' . $assegnato_corrente);
        }

        wp_delete_post($post_id, true);
        return rest_ensure_response(['eliminata' => true]);
    }

    private function formatta_nota($post)
    {
        $allegato_id = get_post_meta($post->ID, '_nota_allegato_id', true);

        // Recupera le etichette associate alla nota
        $termini = wp_get_post_terms($post->ID, 'tag_nota', ['fields' => 'all']);
        $tags = [];
        if (!is_wp_error($termini)) {
            foreach ($termini as $t) {
                $tags[] = [
                    'id' => $t->term_id,
                    'name' => $t->name,
                    'slug' => $t->slug
                ];
            }
        }

        $categorie = wp_get_post_terms($post->ID, 'categoria_nota', ['fields' => 'all']);
        $categorie_nota = [];
        if (!is_wp_error($categorie)) {
            foreach ($categorie as $cat) {
                $categorie_nota[] = [
                    'id' => $cat->term_id,
                    'name' => $cat->name,
                    'slug' => $cat->slug,
                ];
            }
        }

        $commenti = get_post_meta($post->ID, '_nota_commenti', true);
        if (!is_array($commenti))
            $commenti = [];

        $user_id = (int) get_post_meta($post->ID, '_nota_assegnato_a', true);
        $assegnato_data = null;
        if ($user_id) {
            $user_info = get_userdata($user_id);
            if ($user_info) {
                $assegnato_data = [
                    'id' => $user_info->ID,
                    'name' => $user_info->display_name
                ];
            }
        }

        return [
            'id' => $post->ID,
            'titolo' => $post->post_title,
            'contenuto' => $post->post_content,
            'stato' => get_post_meta($post->ID, '_nota_stato', true) ?: 'todo',
            'priorita' => get_post_meta($post->ID, '_nota_priorita', true) ?: 'media',
            'scadenza' => get_post_meta($post->ID, '_nota_scadenza', true),
            'assegnato_a' => $assegnato_data, // Restituisce l'oggetto {id, name} o null
            'allegato_url' => $allegato_id ? wp_get_attachment_url($allegato_id) : null,
            'categoria_nota' => $categorie_nota,
            'tag_nota' => $tags,
            'commenti' => $commenti,
            'edit_url' => get_edit_post_link($post->ID, 'raw'),
        ];
    }

    public function get_utenti()
    {
        $utenti = get_users(['capability' => 'edit_posts', 'fields' => ['ID', 'display_name']]);
        $out = [];

        foreach ($utenti as $u) {
            $out[] = [
                'id' => $u->ID,
                'name' => $u->display_name
            ];
        }

        return rest_ensure_response($out);
    }

    public function get_tag()
    {
        $termini = get_terms([
            'taxonomy' => 'tag_nota',
            'hide_empty' => false
        ]);

        $out = [];
        if (!is_wp_error($termini)) {
            foreach ($termini as $t) {
                $out[] = [
                    'id' => $t->term_id,
                    'name' => $t->name,
                    'slug' => $t->slug
                ];
            }
        }

        return rest_ensure_response($out);
    }
}