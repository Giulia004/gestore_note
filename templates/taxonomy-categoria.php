<?php
if (!defined('ABSPATH'))
    exit;
?>

<tr class="form-field">
    <th scope="row"><label for="categoria_utente_id">Assegnatario predefinito</label></th>
    <td>
        <select name="categoria_utente_id" id="categoria_utente_id">
            <option value="">-- Nessuno --</option>
            <?php foreach ($utenti as $u): ?>
                <option value="<?php echo esc_attr($u->ID); ?>" <?php selected($user_id_assegnato, $u->ID); ?>>
                    <?php echo esc_html($u->display_name); ?>
                </option>
            <?php endforeach; ?>
        </select>
        <p class="description">Le task create con questa categoria verranno assegnate automaticamente a questo utente.
        </p>
    </td>
</tr>

<tr class="form-field">
    <th scope="row"><label for="categoria_utenti">Utenti abilitati</label></th>
    <td>
        <select name="categoria_utenti[]" id="categoria_utenti" multiple="multiple" style="min-height: 120px;">
            <?php foreach ($utenti as $u): ?>
                <option value="<?php echo esc_attr($u->ID); ?>" <?php selected(in_array((string) $u->ID, array_map('strval', $utenti_abilitati), true), true); ?>>
                    <?php echo esc_html($u->display_name); ?>
                </option>
            <?php endforeach; ?>
        </select>
        <p class="description">Seleziona gli utenti che possono essere assegnati a questa categoria. Se lasci vuoto,
            tutti gli utenti sono disponibili.</p>
    </td>
</tr>