<?php
if (!defined('ABSPATH')) {
    exit;
}

class Gestore_Note_Dashboard_Widget
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
        add_action('wp_dashboard_setup', [$this, 'aggiungi_widget_bacheca']);
    }

    public function aggiungi_widget_bacheca()
    {
        if (current_user_can('edit_posts')) {
            $user_id = get_current_user();
            $task_list = $this->get_user_tasks($user_id);

            //Calcolo di eventuali task in scadenza
            $urgenti_count = 0;
            $today = strtotime(current_time('Y-m-d'));

            foreach ($task_list as $task) {
                $scadenza = get_post_meta($task->ID, '_nota_scadenza', true);
                if ($scadenza) {
                    $diff = round((strtotime($scadenza) - $today) / 86400);
                    if ($diff <= 0)
                        $urgenti_count++;
                }
            }

            $titolo = 'Le tue prossime task (Bacheca Rapida)';
            if ($urgenti_count > 0)
                $titolo .= ' <span class="update-plugins count-' . $urgenti_count . '" style="background: #d63638; color: #fff; padding: 1px 6px; border-radius: 10px; font-size: 11px; vertical-align: middle;">' . $urgenti_count . ' urgenti</span>';

            wp_add_dashboard_widget(
                'gestore_note_task_widget',
                $titolo,
                [$this, 'render_widget']
            );
        }
    }

    private function get_user_tasks($user_id)
    {
        $transient_key = 'gestore_note_widget_task_' . $user_id;
        $task_list = get_transient($transient_key);

        if (false === $task_list) {
            $query_args = [
                'post_type' => 'wp_nota_interna',
                'post_status' => 'publish',
                'posts_per_page' => 5,
                'meta_query' => [
                    'relation' => 'AND',
                    [
                        'key' => '_nota_assegnato_a',
                        'value' => $user_id,
                    ],
                    [
                        'key' => '_nota_stato',
                        'value' => 'done',
                        'compare' => '!=',
                    ],
                ],
                'orderby' => [
                    'meta_value' => 'ASC',
                ],
                'meta_key' => '_nota_scadenza',
            ];

            $task_list = get_posts($query_args);
            set_transient($transient_key, $task_list, 4 * HOUR_IN_SECONDS);
        }

        return $task_list;
    }
    public function pulisci_transient_task($post_id, $post, $update)
    {
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)
            return;

        //Recupero l'utente a cui è assegnata la task o l'autore
        $user_id = get_post_meta($post_id, '_nota_assegnato_a', true);
        if ($user_id)
            delete_transient('gestore_note_widget_task_' . $user_id);
    }

    public function pulisci_transient_eliminazione($post_id)
    {
        if (get_post_type($post_id) !== 'wp_nota_interna')
            return;

        //Puliamo i transient di tutti gli utenti
        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_gestore_note_widget_task_%' OR option_name LIKE '_transient_timeout_gestore_note_widget_task_%'");
    }

    public function render_widget()
    {
        $user_id = get_current_user_id();
        $task_list = $this->get_user_tasks($user_id);

        $template_path = plugin_dir_path(dirname(__FILE__)) . 'templates/dashboard-widget.php';
        if (file_exists($template_path)) {
            include $template_path;
        }
    }
}

Gestore_Note_Dashboard_Widget::get_instance();