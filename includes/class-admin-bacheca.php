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
                'tags' => $this->get_tag_per_js(),
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
        ?>
        <div class="wrap wrap-bacheca-note">
            <!-- Pulsante per aprire la web app Angular -->
            <div
                style="margin: 15px 0 20px 0; background: #fff; padding: 15px; border-radius: 4px; border: 1px solid #c3c4c7; border-left: 4px solid #2271b1; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 1px rgba(0,0,0,.04);">
                <div>
                    <h2 style="margin: 0 0 5px 0; font-size: 15px; color: #1d2327;">🚀 Dashboard Angular Moderna</h2>
                    <p style="margin: 0; color: #646970; font-size: 13px;">Passa all'interfaccia interattiva per gestire le tue
                        task in tempo reale.</p>
                </div>
                <a href="http://localhost:4200/board" target="_blank" class="button button-primary button-hero"
                    style="font-size: 14px; height: 36px; line-height: 34px; padding: 0 16px;">
                    Apri l'app &rarr;
                </a>
            </div>

            <div class="bacheca-header">
                <h1>Task Manager</h1>
            </div>
            <div class="bacheca-toolbar">
                <input type="text" id="nota-nuovo-titolo" placeholder="Nuova nota...">

                <select id="nota-nuova-categoria">
                    <option value="">-- Categoria --</option>
                    <?php foreach ($categorie as $cat): ?>
                        <option value="<?php echo esc_attr($cat['id']); ?>"><?php echo esc_html($cat['name']); ?></option>
                    <?php endforeach; ?>
                </select>

                <select id="nota-nuova-priorita" title="priorità">
                    <option value="">Priorità</option>
                    <option value="bassa">Bassa</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                </select>
                <input type="date" id="nota-nuova-scadenza">
                <select id="nota-nuovo-assegnato">
                    <option value="">-- Nessuno --</option>
                    <?php foreach ($this->get_utenti_per_js() as $u): ?>
                        <option value="<?php echo esc_attr($u['id']); ?>"><?php echo esc_html($u['name']); ?></option>
                    <?php endforeach; ?>
                </select>
                <select id="nota-nuovo-tag">
                    <option value="">-- Etichetta --</option>
                    <?php foreach ($tags as $tag): ?>
                        <option value="<?php echo esc_attr($tag['id']); ?>"><?php echo esc_html($tag['name']); ?></option>
                    <?php endforeach; ?>
                </select>
                <input type="file" id="nota-nuovo-allegato" title="Allega file">
                <button type="button" id="nota-aggiungi-btn" class="button button-primary">+ Aggiungi Nota</button>
            </div>

            <div class="bacheca-filtri" style="margin: 15px 0; display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                <input type="text" id="filtro-ricerca" placeholder="Cerca tra le note..."
                    style="flex: 1 1 220px; padding: 4px 8px;">

                <select id="filtro-assegnato">
                    <option value="">Tutti gli utenti</option>
                    <?php foreach ($this->get_utenti_per_js() as $u): ?>
                        <option value="<?php echo esc_attr($u['id']); ?>"><?php echo esc_html($u['name']); ?></option>
                    <?php endforeach; ?>
                </select>

                <select id="filtro-priorita">
                    <option value="">Tutte le priorità</option>
                    <option value="bassa">Bassa</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                </select>

                <select id="filtro-categoria">
                    <option value="">Tutte le categorie</option>
                    <?php foreach ($categorie as $cat): ?>
                        <option value="<?php echo esc_attr($cat['id']); ?>"><?php echo esc_html($cat['name']); ?></option>
                    <?php endforeach; ?>
                </select>

                <select id="filtro-tag">
                    <option value="">Tutte le etichette</option>
                    <?php foreach ($tags as $tag): ?>
                        <option value="<?php echo esc_attr($tag['id']); ?>"><?php echo esc_html($tag['name']); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div id="bacheca-board" class="bacheca-board">
                <div class="bacheca-colonna" data-stato="todo">
                    <h2>Da fare <span class="bacheca-conteggio" data-conteggio="todo">0</span></h2>
                    <div class="bacheca-colonna-note" data-stato="todo"></div>
                </div>
                <div class="bacheca-colonna" data-stato="doing">
                    <h2>In corso <span class="bacheca-conteggio" data-conteggio="doing">0</span></h2>
                    <div class="bacheca-colonna-note" data-stato="doing"></div>
                </div>
                <div class="bacheca-colonna" data-stato="done">
                    <h2>Completato <span class="bacheca-conteggio" data-conteggio="done">0</span></h2>
                    <div class="bacheca-colonna-note" data-stato="done"></div>
                </div>
            </div>

            <template id="template-card-nota">
                <div class="card-nota" draggable="true">
                    <div class="card-nota-tags" style="margin-bottom: 6px; display: flex; gap: 4px; flex-wrap: wrap;"></div>
                    <h3 class="card-nota-titolo"></h3>
                    <div class="card-nota-contenuto"></div>

                    <div class="card-nota-sezione-commenti"
                        style="margin-top: 10px; border-top: 1px dashed #ddd; padding-top: 8px;">
                        <div class="card-nota-lista-commenti"
                            style="font-size: 12px; margin-bottom: 6px; max-height: 100px; overflow-y: auto;"></div>
                        <div style="display: flex; gap: 4px;">
                            <input type="text" class="card-nota-input-commento" placeholder="Scrivi un commento..."
                                style="flex: 1; font-size: 11px; padding: 3px 6px; height: 26px; border: 1px solid #ccd0d4; border-radius: 3px;">
                            <button type="button" class="button card-nota-btn-commento"
                                style="font-size: 11px; height: 26px; line-height: 24px; padding: 0 8px;">Invia</button>
                        </div>
                    </div>

                    <div class="card-nota-footer">
                        <span class="card-nota-scadenza"></span>
                        <span class="card-nota-priorita"></span>
                    </div>
                    <div class="card-nota-assegnato"></div>

                    <!-- Pulsanti azione rapidi -->
                    <button type="button" class="card-nota-modifica" title="Modifica">✏️</button>
                    <button type="button" class="card-nota-elimina" title="Elimina">&times;</button>
                </div>
            </template>

            <!-- MODALE DI MODIFICA NOTA -->
            <div id="gestore-note-modale" class="gestore-note-modale-overlay" style="display: none;">
                <div class="gestore-note-modale-contenuto">
                    <h2>Modifica Task</h2>

                    <input type="hidden" id="modale-nota-id">

                    <div class="gestore-note-campo">
                        <label>Titolo</label>
                        <input type="text" id="modale-nota-titolo">
                    </div>

                    <div class="gestore-note-campo">
                        <label>Contenuto</label>
                        <textarea id="modale-nota-contenuto" rows="3"></textarea>
                    </div>

                    <div class="gestore-note-riga-doppia">
                        <div class="gestore-note-campo">
                            <label>Priorità</label>
                            <select id="modale-nota-priorita">
                                <option value="bassa">Bassa</option>
                                <option value="media">Media</option>
                                <option value="alta">Alta</option>
                            </select>
                        </div>
                        <div class="gestore-note-campo">
                            <label>Scadenza</label>
                            <input type="date" id="modale-nota-scadenza">
                        </div>
                    </div>

                    <div class="gestore-note-riga-doppia">
                        <div class="gestore-note-campo">
                            <label>Assegnato a</label>
                            <select id="modale-nota-assegnato">
                                <option value="">-- Nessuno --</option>
                                <?php foreach ($this->get_utenti_per_js() as $u): ?>
                                    <option value="<?php echo esc_attr($u['id']); ?>"><?php echo esc_html($u['name']); ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="gestore-note-campo">
                            <label>Categoria</label>
                            <select id="modale-nota-categoria">
                                <option value="">-- Nessuna --</option>
                                <?php foreach ($categorie as $cat): ?>
                                    <option value="<?php echo esc_attr($cat['id']); ?>"><?php echo esc_html($cat['name']); ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>

                    <div class="gestore-note-riga-doppia">
                        <div class="gestore-note-campo">
                            <label>Etichetta</label>
                            <select id="modale-nota-tag">
                                <option value="">-- Nessuna --</option>
                                <?php foreach ($tags as $tag): ?>
                                    <option value="<?php echo esc_attr($tag['id']); ?>"><?php echo esc_html($tag['name']); ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>

                    <div class="gestore-note-modale-azioni">
                        <button type="button" id="modale-btn-annulla" class="button">Annulla</button>
                        <button type="button" id="modale-btn-salva" class="button button-primary">Salva modifiche</button>
                    </div>
                </div>
            </div>

        </div>
        <?php
    }
}