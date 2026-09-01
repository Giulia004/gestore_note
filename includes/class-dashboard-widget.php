<?php
if (!defined('ABSPATH')) {
    exit;
}

class Gestore_Note_Dashboard_Widget {

    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('wp_dashboard_setup', [$this, 'aggiungi_widget_bacheca']);
    }

    public function aggiungi_widget_bacheca() {
        if (current_user_can('edit_posts')) {
            wp_add_dashboard_widget(
                'gestore_note_task_widget',
                'Le tue prossime task (Bacheca Rapida)',
                [$this, 'render_widget']
            );
        }
    }

    public function render_widget() {
        $user_id = get_current_user_id();
        $oggi = current_time('Y-m-d');
        
        // 1. Definisco la chiave univoca del transient per l'utente loggato
        $transient_key = 'gestore_note_widget_task_' . $user_id;
        
        // 2. Provo a recuperare i dati dalla cache
        $task_list = get_transient($transient_key);

        // 3. Se la cache è vuota o scaduta, eseguo la query
        if (false === $task_list) {
            $query_args = [
                'post_type'      => 'wp_nota_interna',
                'post_status'    => 'publish',
                'posts_per_page' => 5,
                'meta_query'     => [
                    'relation' => 'AND',
                    [
                        'key'   => '_nota_assegnato_a',
                        'value' => $user_id,
                    ],
                    [
                        'key'   => '_nota_stato',
                        'value' => 'done',
                        'compare' => '!=',
                    ],
                ],
                'orderby'        => [
                    'meta_value' => 'ASC',
                ],
                'meta_key'       => '_nota_scadenza',
            ];

            $task_list = get_posts($query_args);
            
            // Salvo i risultati nel transient per 4 ore
            set_transient($transient_key, $task_list, 4 * HOUR_IN_SECONDS);
        }

        echo '<div class="gestore-note-dashboard-widget" style="padding: 4px 0;">';

        if (!empty($task_list)) {
            echo '<ul id="gestore-note-widget-list" style="margin: 0; padding: 0; list-style: none;">';
            foreach ($task_list as $post) {
                $scadenza = get_post_meta($post->ID, '_nota_scadenza', true);
                $priorita = get_post_meta($post->ID, '_nota_priorita', true) ?: 'media';
                $stato = get_post_meta($post->ID, '_nota_stato', true) ?: 'todo';
                
                $colore_stato = ('doing' === $stato) ? '#2271b1' : '#dba617';
                
                $colori_priorita = [
                    'alta'  => '#d63638',
                    'media' => '#dba617',
                    'bassa' => '#787c82'
                ];
                $colore_prio = $colori_priorita[$priorita] ?? '#787c82';

                $testo_scadenza = $scadenza ? date_i18n(get_option('date_format'), strtotime($scadenza)) : 'Nessuna scadenza';
                $stile_data = 'color: #646970;';
                
                if ($scadenza && $scadenza < $oggi) {
                    $stile_data = 'color: #d63638; font-weight: 600;';
                    $testo_scadenza .= ' (Scaduta)';
                }

                $edit_url = get_edit_post_link($post->ID);

                echo '<li id="widget-task-' . esc_attr($post->ID) . '" style="margin-bottom: 10px; padding: 10px 12px; background: #f6f7f7; border-left: 4px solid ' . esc_attr($colore_stato) . '; border-radius: 0 4px 4px 0; display: flex; justify-content: space-between; align-items: center; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05); transition: opacity 0.3s ease;">';
                
                // Info sinistra
                echo '<div style="overflow: hidden; padding-right: 10px; flex-grow: 1;">';
                echo '<div style="display: flex; align-items: center; gap: 6px;">';
                echo '<span title="Priorità: ' . esc_attr(ucfirst($priorita)) . '" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:' . esc_attr($colore_prio) . '; flex-shrink:0;"></span>';
                echo '<a href="' . esc_url($edit_url) . '" style="font-weight: 600; font-size: 13px; text-decoration: none; color: #1d2327; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="' . esc_attr($post->post_title) . '">' . esc_html($post->post_title) . '</a>';
                echo '</div>';
                
                echo '<span style="font-size: 11px; ' . $stile_data . ' display: inline-block; margin-top: 3px;"><span class="dashicons dashicons-calendar-alt" style="font-size: 13px; width: 13px; height: 13px; vertical-align: text-bottom; margin-right: 2px;"></span> ' . esc_html($testo_scadenza) . '</span>';
                echo '</div>';
                
                echo '</li>';
            }
            echo '</ul>';
            
            $url_bacheca = admin_url('edit.php?post_type=wp_nota_interna&page=gestore-note-bacheca');
            echo '<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">';
            echo '<span style="font-size: 11px; color: #646970;">Mostro le prime 5 task attive</span>';
            echo '<a href="' . esc_url($url_bacheca) . '" class="button button-secondary" style="font-size: 12px;">Apri Bacheca &rarr;</a>';
            echo '</div>';
            
        } else {
            echo '<div style="text-align: center; padding: 20px 0; color: #646970;">';
            echo '<span class="dashicons dashicons-yes-alt" style="font-size: 32px; width: 32px; height: 32px; color: #00a32a; margin-bottom: 8px;"></span>';
            echo '<p style="margin: 0; font-size: 13px; font-weight: 500;">Ottimo lavoro! Non ci sono task attive assegnate a te.</p>';
            echo '</div>';
        }

        echo '</div>';
    }
}

Gestore_Note_Dashboard_Widget::get_instance();