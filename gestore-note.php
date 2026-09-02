<?php
/**
 * Plugin Name: Task Manager
 * Description: Un plugin interno per gestire note, promemoria e to-do list nella bacheca di WordPress.
 * Version:     1.0.0
 * Author:      Giulia
 */

if (!defined('ABSPATH'))
    exit;

require_once plugin_dir_path(__FILE__) . 'includes/class-post-type.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-admin-bacheca.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-rest-api.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-dashboard-widget.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-chat-live.php';

class Gestore_Note_Plugin
{
    private static $instance = null;

    public static function get_instance()
    {
        if (null === self::$instance)
            self::$instance = new self();

        return self::$instance;
    }

    private function __construct()
    {
        Gestore_Note_Post_Type::get_instance();
        Gestore_Note_Bacheca::get_instance();
        Gestore_Note_Rest_Api::get_instance();
        Gestore_Note_Dashboard_Widget::get_instance();
        Gestore_Note_Chat_Live::get_instance();
    }

}

function avvia_gestore_note()
{
    return Gestore_Note_Plugin::get_instance();
}

avvia_gestore_note();