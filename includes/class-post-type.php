<?php
if (!defined('ABSPATH')) {
    exit;
}

class Gestore_Note_Post_Type
{

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
        add_action('init', [$this, 'registra_custom_post_type']);
        add_action('add_meta_boxes', [$this, 'aggiungi_meta_boxes']);
        add_action('save_post', [$this, 'salva_meta_dati']);

        // Nuovo hook per svuotare la cache quando una nota viene eliminata
        add_action('deleted_post', [$this, 'invalida_cache_widget_su_eliminazione']);

        add_filter('manage_wp_nota_interna_posts_columns', [$this, 'gestisci_colonne_tabella']);
        add_action('manage_wp_nota_interna_posts_custom_column', [$this, 'riempi_colonne_tabella'], 10, 2);

        add_action('admin_menu', [$this, 'rimuovi_voci_menu'], 999);

        add_action('init', [$this, 'registra_tassonomia_tag']);
        add_action('init', [$this, 'registra_tassonomia_categoria']);

        add_action('categoria_nota_add_form_fields', [$this, 'aggiungi_campo_utente_categoria'], 10, 1);
        add_action('categoria_nota_edit_form_fields', [$this, 'aggiungi_campo_utente_categoria'], 10, 1);
        add_action('created_categoria_nota', [$this, 'salva_campo_categoria'], 10, 1);
        add_action('edited_categoria_nota', [$this, 'salva_campo_categoria'], 10, 1);
    }

    public function registra_tassonomia_tag()
    {
        register_taxonomy('tag_nota', 'wp_nota_interna', [
            'labels' => [
                'name' => 'Etichette',
                'singular_name' => 'Etichetta',
                'search_items' => 'Cerca Etichette',
                'all_items' => 'Tutte le Etichette',
                'edit_item' => 'Modifica Etichetta',
                'update_item' => 'Aggiorna Etichetta',
                'add_new_item' => 'Aggiungi Nuova Etichetta',
                'new_item_name' => 'Nome Nuova Etichetta',
                'menu_name' => 'Etichette',
            ],
            'hierarchical' => true,
            'show_ui' => false,
            'show_in_menu' => false,
            'show_in_nav_menus' => false,
            'meta_box_cb' => false,
            'show_in_rest' => true,
            'show_admin_column' => true,
        ]);
    }

    public function registra_tassonomia_categoria()
    {
        register_taxonomy('categoria_nota', 'wp_nota_interna', [
            'labels' => [
                'name' => 'Categorie',
                'singular_name' => 'Categoria',
                'search_items' => 'Cerca Categorie',
                'all_items' => 'Tutte le Categorie',
                'edit_item' => 'Modifica Categoria',
                'update_item' => 'Aggiorna Categoria',
                'add_new_item' => 'Aggiungi Nuova Categoria',
                'new_item_name' => 'Nome Nuova Categoria',
                'menu_name' => 'Categorie',
            ],
            'hierarchical' => true,
            'show_ui' => false,
            'show_in_menu' => false,
            'show_in_nav_menus' => false,
            'meta_box_cb' => false,
            'show_in_rest' => true,
            'show_admin_column' => true,
        ]);
    }

    public function registra_custom_post_type()
    {
        $args = [
            'labels' => [
                'name' => 'Note Interne',
                'singular_name' => 'Nota Interna',
                'add_new' => 'Aggiungi Nuova',
                'add_new_item' => 'Aggiungi Nuova Nota',
                'edit_item' => 'Modifica Nota',
                'new_item' => 'Nuova Nota',
                'view_item' => 'Visualizza Nota',
                'search_items' => 'Cerca Note',
                'not_found' => 'Nessuna nota trovata',
                'not_found_in_trash' => 'Nessuna nota nel cestino',
            ],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'capability_type' => 'post',
            'hierarchical' => false,
            'supports' => ['title', 'editor', 'author', 'thumbnail'],
            'taxonomies' => ['tag_nota'],
            'menu_icon' => 'dashicons-clipboard',
            'menu_position' => 20,
            'show_in_rest' => true,
        ];

        register_post_type('wp_nota_interna', $args);
    }

    public function rimuovi_voci_menu()
    {
        remove_submenu_page('edit.php?post_type=wp_nota_interna', 'edit.php?post_type=wp_nota_interna');
        remove_submenu_page('edit.php?post_type=wp_nota_interna', 'post-new.php?post_type=wp_nota_interna');
    }

    public function aggiungi_campo_utente_categoria($term = null)
    {
        $term_id = $term && isset($term->term_id) ? $term->term_id : 0;
        $user_id_assegnato = get_term_meta($term_id, '_categoria_utente_id', true);
        $utenti_abilitati = get_term_meta($term_id, '_categoria_utenti', true);
        $utenti_abilitati = is_array($utenti_abilitati) ? $utenti_abilitati : [];
        $utenti = get_users(['capability' => 'edit_posts']);

        $template_path = plugin_dir_path(dirname(__FILE__)) . 'templates/taxonomy-categoria.php';
        if (file_exists($template_path))
            include $template_path;
    }

    public function salva_campo_categoria($term_id)
    {
        if (isset($_POST['categoria_utente_id'])) {
            update_term_meta($term_id, '_categoria_utente_id', absint($_POST['categoria_utente_id']));
        }

        if (isset($_POST['categoria_utenti'])) {
            $utenti = array_map('absint', (array) $_POST['categoria_utenti']);
            update_term_meta($term_id, '_categoria_utenti', array_values(array_unique($utenti)));
        } else {
            delete_term_meta($term_id, '_categoria_utenti');
        }
    }
    public function aggiungi_meta_boxes()
    {
        add_meta_box(
            'gestore_note_dettagli',
            'Dettagli Promemoria e Allegato',
            [$this, 'render_meta_box'],
            'wp_nota_interna',
            'side',
            'high'
        );
    }

    public function render_meta_box($post)
    {
        $data_scadenza = get_post_meta($post->ID, '_nota_scadenza', true);
        $priorita = get_post_meta($post->ID, '_nota_priorita', true);
        $assegnato_a = get_post_meta($post->ID, '_nota_assegnato_a', true);
        $stato = get_post_meta($post->ID, '_nota_stato', true) ?: 'todo';
        $allegato_id = get_post_meta($post->ID, '_nota_allegato_id', true);

        wp_nonce_field('gestore_note_salva_dati', 'gestore_note_nonce');

        $utenti = get_users(['capability' => 'edit_posts']);
        $url_allegato = $allegato_id ? wp_get_attachment_url($allegato_id) : '';
        $nome_allegato = $allegato_id ? get_the_title($allegato_id) : '';

        $template_path = plugin_dir_path(dirname(__FILE__)) . 'templates/metabox-dettagliati.php';
        if (file_exists($template_path))
            include $template_path;
    }

    public function salva_meta_dati($post_id)
    {
        if (!isset($_POST['gestore_note_nonce']) || !wp_verify_nonce($_POST['gestore_note_nonce'], 'gestore_note_salva_dati')) {
            return;
        }
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        // Salviamo il vecchio assegnatario prima di aggiornare i metadati
        $vecchio_assegnato = get_post_meta($post_id, '_nota_assegnato_a', true);

        if (isset($_POST['nota_stato'])) {
            update_post_meta($post_id, '_nota_stato', sanitize_key($_POST['nota_stato']));
        }
        if (isset($_POST['nota_scadenza'])) {
            update_post_meta($post_id, '_nota_scadenza', sanitize_text_field($_POST['nota_scadenza']));
        }
        if (isset($_POST['nota_priorita'])) {
            update_post_meta($post_id, '_nota_priorita', sanitize_text_field($_POST['nota_priorita']));
        }
        if (isset($_POST['nota_assegnato_a'])) {
            update_post_meta($post_id, '_nota_assegnato_a', sanitize_text_field($_POST['nota_assegnato_a']));
        }

        if (isset($_POST['nota_assegnato_a'])) {
            $assegnato_val = sanitize_text_field($_POST['nota_assegnato_a']);
            if (!empty($assegnato_val)) {
                update_post_meta($post_id, '_nota_assegnato_a', $assegnato_val);
            } else {
                delete_post_meta($post_id, '_nota_assegnato_a');
            }
        }
        if (isset($_POST['nota_rimuovi_allegato']) && $_POST['nota_rimuovi_allegato'] == '1') {
            delete_post_meta($post_id, '_nota_allegato_id');
        }

        // Svuotiamo la cache del vecchio utente
        if ($vecchio_assegnato) {
            delete_transient('gestore_note_widget_task_' . $vecchio_assegnato);
        }

        $nuovo_assegnato = get_post_meta($post_id, '_nota_assegnato_a', true);
        if ($nuovo_assegnato && $nuovo_assegnato != $vecchio_assegnato) {
            delete_transient('gestore_note_widget_task_' . $nuovo_assegnato);
        }
    }

    // Nuovo metodo per svuotare la cache in caso di cancellazione della nota
    public function invalida_cache_widget_su_eliminazione($post_id)
    {
        if ('wp_nota_interna' === get_post_type($post_id)) {
            $assegnato_a = get_post_meta($post_id, '_nota_assegnato_a', true);
            if ($assegnato_a) {
                delete_transient('gestore_note_widget_task_' . $assegnato_a);
            }
        }
    }

    public function gestisci_colonne_tabella($columns)
    {
        $new_columns = [];
        foreach ($columns as $key => $title) {
            $new_columns[$key] = $title;
            if ('title' === $key) {
                $new_columns['stato'] = 'Stato';
                $new_columns['scadenza'] = 'Scadenza';
                $new_columns['priorita'] = 'Priorità';
                $new_columns['allegato'] = 'Allegato';
            }
        }
        return $new_columns;
    }

    public function riempi_colonne_tabella($column, $post_id)
    {
        if ('stato' === $column) {
            $etichette = ['todo' => 'Da fare', 'doing' => 'In corso', 'done' => 'Completato'];
            $stato = get_post_meta($post_id, '_nota_stato', true) ?: 'todo';
            echo esc_html($etichette[$stato] ?? $stato);
        }
        if ('scadenza' === $column) {
            $scadenza = get_post_meta($post_id, '_nota_scadenza', true);
            echo $scadenza ? esc_html($scadenza) : '<em>Nessuna</em>';
        }
        if ('priorita' === $column) {
            $priorita = get_post_meta($post_id, '_nota_priorita', true);
            echo $priorita ? ucfirst(esc_html($priorita)) : 'Media';
        }
        if ('allegato' === $column) {
            $allegato_id = get_post_meta($post_id, '_nota_allegato_id', true);
            if ($allegato_id) {
                $url = wp_get_attachment_url($allegato_id);
                echo '<a href="' . esc_url($url) . '" target="_blank">📎 Apri</a>';
            } else {
                echo '—';
            }
        }
    }
}