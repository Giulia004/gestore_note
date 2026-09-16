<?php
if (!defined('ABSPATH')) {
    exit;
}

class Gestore_Note_Bacheca
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
        add_action('admin_menu', [$this, 'aggiungi_pagina_menu'], 99);
        add_action('admin_enqueue_scripts', [$this, 'carica_assets_bacheca']);
    }

    public function aggiungi_pagina_menu()
    {
        add_submenu_page(
            'edit.php?post_type=wp_nota_interna',
            'Bacheca Rapida',
            'Bacheca Rapida',
            'edit_posts',
            'gestore-note-bacheca',
            [$this, 'render_pagina_bacheca'],
            0
        );
    }

    public function carica_assets_bacheca($hook)
    {
        if ('wp_nota_interna_page_gestore-note-bacheca' !== $hook) {
            return;
        }

        $plugin_url = plugin_dir_url(dirname(__FILE__));

        wp_enqueue_style(
            'gestore-note-bacheca-css',
            $plugin_url . 'assets/css/bacheca.css',
            [],
            '2.5.0'
        );

        wp_enqueue_script(
            'gestore-note-api',
            $plugin_url . 'assets/js/api.js',
            [],
            '3.0.3',
            true
        );

        wp_enqueue_script(
            'gestore-note-bacheca',
            $plugin_url . 'assets/js/bacheca.js',
            ['gestore-note-api'],
            '3.0.3',
            true
        );
        wp_enqueue_script(
            'gestore-note-modale',
            $plugin_url . 'assets/js/modale.js',
            ['gestore-note-api', 'gestore-note-bacheca'],
            '3.0.4',
            true
        );

        wp_enqueue_script(
            'gestore-note-sottotask',
            $plugin_url . 'assets/js/sottotask.js',
            ['gestore-note-modale'],
            '3.0.3',
            true
        );

        $categorie = $this->get_categorie_per_js();
        $utenti_per_categoria = [];
        foreach ($categorie as $cat) {
            $ids = get_term_meta($cat['id'], '_categoria_utenti', true);
            $utenti_per_categoria[$cat['id']] = array_map('intval', (array) $ids);
        }

        wp_localize_script(
            'gestore-note-bacheca',
            'GN_Data',
            [
                'restUrl' => esc_url_raw(rest_url('gestore-note/v1')),
                'nonce' => wp_create_nonce('wp_rest'),
                'users' => $this->get_utenti_per_js(),
                'usersByCategory' => $utenti_per_categoria,
                'categories' => $categorie,
                'tags' => $this->get_tag_per_js(),
                'currentUser' => wp_get_current_user()->display_name,
                'currentUserId' => get_current_user_id(),
                'i18n' => [
                    'unassigned' => 'Nessuno',
                    'confirmDelete' => 'Eliminare questa nota?',
                ],
            ]
        );


    }

    private function get_utenti_per_js()
    {
        $utenti = get_users(['capability' => 'edit_posts', 'fields' => ['ID', 'display_name']]);
        $out = [];
        foreach ($utenti as $u) {
            $out[] = ['id' => $u->ID, 'name' => $u->display_name];
        }
        return $out;
    }

    private function get_tag_per_js()
    {
        $termini = get_terms([
            'taxonomy' => 'tag_nota',
            'hide_empty' => false,
        ]);
        $out = [];
        if (!is_wp_error($termini)) {
            foreach ($termini as $t) {
                $out[] = ['id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug];
            }
        }
        return $out;
    }

    private function get_categorie_per_js()
    {
        $termini = get_terms([
            'taxonomy' => 'categoria_nota',
            'hide_empty' => false,
        ]);
        $out = [];
        if (!is_wp_error($termini)) {
            foreach ($termini as $t) {
                $out[] = ['id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug];
            }
        }
        return $out;
    }

    public function render_pagina_bacheca()
    {
        $tags = $this->get_tag_per_js();
        $categorie = $this->get_categorie_per_js();
        $utenti = $this->get_utenti_per_js();
        $template_path = plugin_dir_path(dirname(__FILE__)) . 'templates/bacheca-page.php';

        if (file_exists($template_path))
            include $template_path;
    }
}