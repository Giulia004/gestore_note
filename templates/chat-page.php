<?php
if (!defined('ABSPATH')) {
    exit;
}
$tags = isset($tags) ? $tags : [];
$categorie = isset($categorie) ? $categorie : [];
$utenti = isset($utenti) ? $utenti : [];
?>
<div class="wrap wrap-gestore-note-chat">
    <div class="chat-page-header-bar">
        <div class="chat-title-wrapper">
            <h1>💬 Chat</h1>
            <p class="description">Spazio di comunicazione in tempo reale per i collaboratori e lo scambio rapido di
                aggiornamenti.</p>
        </div>
        <div class="chat-status-badge">
            <span class="status-dot"></span> <span id="chat-status-text">Connesso</span>
        </div>
    </div>

    <div class="gestore-note-chat-container-full">
        <!-- Area messaggi con scroll fluido -->
        <div id="gestore-note-chat-messages" class="chat-messages-full">
            <div class="chat-loading-state">
                <span class="spinner is-active" style="float: none; margin: 0 8px 0 0;"></span> Caricamento
                conversazioni in corso...
            </div>
        </div>

        <!--Form di invio-->
        <!-- Form di invio con allegato -->
        <form id="gestore-note-chat-form" class="chat-form-full"
            style="position: relative; flex-direction: column; align-items: stretch; gap: 8px;">
            <!-- Dropdown suggerimenti @nota -->
            <div id="chat-mentions-dropdown" class="chat-mentions-dropdown" style="display: none;"></div>

            <!-- Anteprima file selezionato -->
            <div id="chat-file-preview"
                style="display: none; align-items: center; justify-content: space-between; background: #f0f6fc; padding: 6px 12px; border-radius: 4px; font-size: 12px; border: 1px solid #cce0ff;">
                <span id="chat-file-name" style="color: #1d2327; font-weight: 500;"></span>
                <button type="button" id="chat-remove-file"
                    style="background: none; border: none; color: #d63638; cursor: pointer; font-weight: bold;">Rimuovi
                    &times;</button>
            </div>

            <div style="display: flex; gap: 10px; align-items: center; width: 100%;">
                <!-- Input file nascosto -->
                <input type="file" id="chat-file-input" style="display: none;">

                <!-- Pulsante graffetta per allegare -->
                <button type="button" id="chat-attach-btn" class="button" title="Allega file"
                    style="padding: 0 10px; height: 40px; display: inline-flex; align-items: center; justify-content: center;">
                    📎
                </button>

                <div class="chat-input-wrapper" style="flex: 1;">
                    <input type="text" id="chat-input-text"
                        placeholder="Messaggio, @nota o /task titolo..." autocomplete="off">
                </div>

                <button type="submit" class="button button-primary button-large"
                    style="display: inline-flex; align-items: center; gap: 6px; height: 40px;">
                    Invia
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                        stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        </form>
    </div>
</div>

<div id="chat-create-task-modal" class="chat-task-modal-overlay" style="display: none;">
    <form id="chat-create-task-form" class="chat-task-modal">
        <h2>Nuova task</h2>
        <div class="chat-task-field">
            <label for="chat-task-title">Titolo</label>
            <input type="text" id="chat-task-title" required maxlength="200" autocomplete="off">
        </div>
        <div class="chat-task-field">
            <label for="chat-task-content">Descrizione</label>
            <textarea id="chat-task-content" rows="3"></textarea>
        </div>
        <div class="chat-task-fields-row">
            <div class="chat-task-field">
                <label for="chat-task-category">Categoria</label>
                <select id="chat-task-category">
                    <option value="">-- Nessuna --</option>
                    <?php foreach ($categorie as $categoria): ?>
                        <option value="<?php echo esc_attr($categoria['id']); ?>">
                            <?php echo esc_html($categoria['name']); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="chat-task-field">
                <label for="chat-task-priority">Priorità</label>
                <select id="chat-task-priority">
                    <option value="media" selected>Media</option>
                    <option value="bassa">Bassa</option>
                    <option value="alta">Alta</option>
                </select>
            </div>
        </div>
        <div class="chat-task-fields-row">
            <div class="chat-task-field">
                <label for="chat-task-assignee">Assegnato a</label>
                <select id="chat-task-assignee">
                    <option value="">-- Nessuno --</option>
                    <?php foreach ($utenti as $utente): ?>
                        <option value="<?php echo esc_attr($utente['id']); ?>">
                            <?php echo esc_html($utente['name']); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="chat-task-field">
                <label for="chat-task-due-date">Scadenza</label>
                <input type="date" id="chat-task-due-date">
            </div>
        </div>
        <div class="chat-task-field">
            <label for="chat-task-tag">Etichetta</label>
            <select id="chat-task-tag">
                <option value="">-- Nessuna --</option>
                <?php foreach ($tags as $tag): ?>
                    <option value="<?php echo esc_attr($tag['id']); ?>">
                        <?php echo esc_html($tag['name']); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <div id="chat-task-feedback" class="chat-task-feedback" role="status" aria-live="polite"></div>
        <div class="chat-task-modal-actions">
            <button type="button" id="chat-task-cancel" class="button">Annulla</button>
            <button type="submit" id="chat-task-submit" class="button button-primary">Crea task</button>
        </div>
    </form>
</div>