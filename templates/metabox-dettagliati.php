<?php
if (!defined('ABSPATH')) {
    exit;
}
?>
<p>
    <label for="nota_stato"><strong>Stato:</strong></label><br>
    <select id="nota_stato" name="nota_stato" style="width: 100%; margin-top: 5px;">
        <option value="todo" <?php selected($stato, 'todo'); ?>>Da fare</option>
        <option value="doing" <?php selected($stato, 'doing'); ?>>In corso</option>
        <option value="done" <?php selected($stato, 'done'); ?>>Completato</option>
    </select>
</p>

<p>
    <label for="nota_scadenza"><strong>Data di Scadenza:</strong></label><br>
    <input type="date" id="nota_scadenza" name="nota_scadenza" value="<?php echo esc_attr($data_scadenza); ?>"
        style="width: 100%; margin-top: 5px;">
</p>

<p>
    <label for="nota_priorita"><strong>Priorità:</strong></label><br>
    <select id="nota_priorita" name="nota_priorita" style="width: 100%; margin-top: 5px;">
        <option value="bassa" <?php selected($priorita, 'bassa'); ?>>Bassa</option>
        <option value="media" <?php selected($priorita, 'media'); ?>>Media</option>
        <option value="alta" <?php selected($priorita, 'alta'); ?>>Alta</option>
    </select>
</p>

<p>
    <label for="nota_assegnato_a"><strong>Assegnato a:</strong></label><br>
    <select id="nota_assegnato_a" name="nota_assegnato_a" style="width: 100%; margin-top: 5px;">
        <option value="">-- Nessuno --</option>
        <?php foreach ($utenti as $utente): ?>
            <option value="<?php echo esc_attr($utente->ID); ?>" <?php selected($assegnato_a, $utente->ID); ?>>
                <?php echo esc_html($utente->display_name); ?>
            </option>
        <?php endforeach; ?>
    </select>
</p>

<hr style="margin: 15px 0; border: 0; border-top: 1px solid #ddd;">

<p>
    <label><strong>File Allegato:</strong></label><br>
    <?php if ($allegato_id && $url_allegato): ?>
        <span style="display: block; margin-top: 5px; font-size: 12px; word-break: break-all;">
            📄 <a href="<?php echo esc_url($url_allegato); ?>" target="_blank">
                <?php echo esc_html($nome_allegato); ?>
            </a>
        </span>
        <input type="hidden" name="nota_allegato_id" value="<?php echo esc_attr($allegato_id); ?>">
        <label style="display: block; margin-top: 8px; font-size: 11px; color: #d63638;">
            <input type="checkbox" name="nota_rimuovi_allegato" value="1"> Rimuovi allegato
        </label>
    <?php else: ?>
        <em style="font-size: 12px; color: #667;">Nessun allegato presente. (Puoi caricarlo dalla bacheca interattiva)</em>
    <?php endif; ?>
</p>