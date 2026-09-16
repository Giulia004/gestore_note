<?php
if (!defined('ABSPATH')) {
    exit;
}
$nonce = wp_create_nonce('wp_rest');
$rest_url = rest_url('gestore-note/v1/note');
?>

<div class="gestore-note-dashboard-widget">
    <?php if (empty($task_list)): ?>
        <p style="color: #646970; text-align: center; padding: 12px 0; margin: 0;">
            🎉 Ottimo lavoro! Non ci sono task in sospeso assegnate a te.
        </p>
    <?php else: ?>
        <ul style="margin: 0; padding: 0; list-style: none;" id="gestore-note-widget-list">
            <?php foreach ($task_list as $task): 
                $scadenza = get_post_meta($task->ID, '_nota_scadenza', true);
                $priorita = get_post_meta($task->ID, '_nota_priorita', true) ?: 'media';
                
                $colore_priorita = '#2271b1';
                if ($priorita === 'alta') $colore_priorita = '#d63638';
                if ($priorita === 'bassa') $colore_priorita = '#00a32a';

                $classe_scadenza = '';
                $testo_scadenza = '';
                if ($scadenza) {
                    $oggi_ts = strtotime(current_time('Y-m-d'));
                    $scad_ts = strtotime($scadenza);
                    $diff_giorni = round(($scad_ts - $oggi_ts) / 86400);

                    if ($diff_giorni < 0) {
                        $testo_scadenza = '⚠️ ' . abs($diff_giorni) . 'g fa';
                        $classe_scadenza = 'color: #d63638; font-weight: 600;';
                    } elseif ($diff_giorni === 0) {
                        $testo_scadenza = '⏰ Oggi';
                        $classe_scadenza = 'color: #b98c0a; font-weight: 600;';
                    } else {
                        $testo_scadenza = '📅 ' . date('d/m', $scad_ts);
                        $classe_scadenza = 'color: #646970;';
                    }
                }
            ?>
                <li id="widget-task-item-<?php echo esc_attr($task->ID); ?>" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f1;">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1; padding-right: 10px; overflow: hidden;">
                        <!-- Checkbox minimale di completamento -->
                        <button type="button" class="completka-task-btn" data-id="<?php echo esc_attr($task->ID); ?>" title="Segna come completato" style="width: 18px; height: 18px; border: 2px solid #c3c4c7; border-radius: 4px; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; transition: all 0.15s ease;" onmouseover="this.style.borderColor='#00a32a'; this.style.background='#f0f6fc';" onmouseout="this.style.borderColor='#c3c4c7'; this.style.background='#fff';">
                            <span style="font-size: 11px; color: #00a32a; line-height: 1; opacity: 0; transition: opacity 0.15s ease;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">✓</span>
                        </button>
                        
                        <!-- Indicatore priorità -->
                        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: <?php echo esc_attr($colore_priorita); ?>; flex-shrink: 0;" title="Priorità: <?php echo esc_attr($priorita); ?>"></span>
                        
                        <!-- Titolo -->
                        <strong style="color: #1d2327; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><?php echo esc_html($task->post_title); ?></strong>
                    </div>
                    
                    <div style="text-align: right; white-space: nowrap;">
                        <span style="font-size: 11px; <?php echo $classe_scadenza; ?>">
                            <?php echo esc_html($testo_scadenza); ?>
                        </span>
                    </div>
                </li>
            <?php endforeach; ?>
        </ul>

        <script>
        document.addEventListener('DOMContentLoaded', function() {
            var container = document.getElementById('gestore-note-widget-list');
            if (!container) return;

            container.addEventListener('click', function(e) {
                var btn = e.target.closest('.completka-task-btn');
                if (!btn) return;

                var taskId = btn.dataset.id;
                var rowItem = document.getElementById('widget-task-item-' + taskId);
                
                btn.disabled = true;
                if (rowItem) rowItem.style.opacity = '0.4';

                fetch('<?php echo esc_url($rest_url); ?>/' + taskId, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': '<?php echo esc_js($nonce); ?>'
                    },
                    body: JSON.stringify({ stato: 'done' })
                }).then(function(res) {
                    if (!res.ok) throw new Error('Errore di rete');
                    return res.json();
                }).then(function() {
                    if (rowItem) {
                        rowItem.style.transition = 'all 0.3s ease';
                        rowItem.style.transform = 'scale(0.98)';
                        rowItem.style.opacity = '0';
                        setTimeout(function() { rowItem.remove(); }, 300);
                    }
                }).catch(function(err) {
                    alert('Errore nel completamento della task');
                    if (rowItem) rowItem.style.opacity = '1';
                    btn.disabled = false;
                });
            });
        });
        </script>
    <?php endif; ?>

    <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #c3c4c7; text-align: right;">
        <?php $url_bacheca = admin_url('admin.php?page=gestore-note-bacheca'); ?>
        <a href="<?php echo esc_url($url_bacheca); ?>" class="button button-small button-secondary">
            Vai alla Bacheca Completa &rarr;
        </a>
    </div>
</div>