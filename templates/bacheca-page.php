<?php
if (!defined('ABSPATH'))
    exit;

$utenti = isset($utenti) ? $utenti : [];
$tags = isset($tags) ? $tags : [];
$categorie = isset($categorie) ? $categorie : [];
?>

<div class="wrap wrap-bacheca-note">
    <div class="bacheca-header">
        <div style="display: flex; align-items: center; gap: 15px; position: relative;">
            <h1>Task Manager</h1>
            <!-- 🔔 CAMPANELLO NOTIFICHE SCADENZE & COMMENTI CON DROPDOWN -->
            <div id="bacheca-notifiche-scadenze" class="gn-campanello-notifiche" style="display: inline-flex;"
                title="Clicca per vedere le notifiche">
                🔔 <span id="gn-badge-conteggio" class="gn-badge-notifiche" style="display: none;">0</span>
            </div>

            <!-- Pannello a comparsa delle notifiche -->
            <div id="gn-notifiche-dropdown" class="gn-notifiche-dropdown" style="display: none;">
                <div class="gn-notifiche-header">
                    <span>Centro Notifiche</span>
                </div>
                <div id="gn-notifiche-lista" class="gn-notifiche-lista">
                    <!-- Popolato dinamicamente via JS -->
                </div>
            </div>
        </div>
        <div class="bacheca-header-actions">
            <button type="button" id="nota-aggiungi-nota-btn" class="button button-primary">
                + Nuova Nota
            </button>
            <button type="button" id="nota-aggiungi-categoria-btn" class="button button-secondary">
                + Nuova categoria
            </button>
            <button type="button" id="nota-modifica-categoria-btn" class="button button-secondary">
                Modifica categoria
            </button>
            <button type="button" id="nota-aggiungi-tag-btn" class="button button-secondary">
                + Nuova etichetta
            </button>
        </div>
    </div>

    <div class="bacheca-filtri" style="margin: 15px 0; display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
        <input type="text" id="filtro-ricerca" placeholder="Cerca tra le note..."
            style="flex: 1 1 220px; padding: 4px 8px;">

        <select id="filtro-assegnato">
            <option value="">Tutti gli utenti</option>
            <?php foreach ($utenti as $u): ?>
                <option value="<?php echo esc_attr($u['id']); ?>">
                    <?php echo esc_html($u['name']); ?>
                </option>
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
                <option value="<?php echo esc_attr($cat['id']); ?>">
                    <?php echo esc_html($cat['name']); ?>
                </option>
            <?php endforeach; ?>
        </select>

        <select id="filtro-tag">
            <option value="">Tutte le etichette</option>
            <?php foreach ($tags as $tag): ?>
                <option value="<?php echo esc_attr($tag['id']); ?>">
                    <?php echo esc_html($tag['name']); ?>
                </option>
            <?php endforeach; ?>
        </select>

        <!-- 🔀 ORDINAMENTO AVANZATO -->
        <select id="filtro-ordinamento">
            <option value="">Ordina per...</option>
            <option value="scadenza">📅 Scadenza imminente</option>
            <option value="priorita">⚡ Priorità</option>
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
            <!-- ⚠️ BADGE NOTIFICA SCADENZA SULLA CARD -->
            <div class="card-nota-badge-scadenza" style="display: none;"></div>

            <div class="card-nota-tags" style="margin-bottom: 6px; display: flex; gap: 4px; flex-wrap: wrap;"></div>
            <h3 class="card-nota-titolo"></h3>
            <div class="card-nota-contenuto"></div>

            <!-- ANTEPRIMA SOTTOTASK NELLA CARD -->
            <div class="card-nota-sottotask-preview"></div>

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

            <!-- 🔀 SPOSTAMENTO RAPIDO TRAMITE FRECCE -->
            <div class="card-nota-spostamento-rapido"
                style="position: absolute; bottom: 8px; right: 8px; display: flex; gap: 4px;"></div>

            <button type="button" class="card-nota-modifica" title="Modifica">✏️</button>
            <button type="button" class="card-nota-elimina" title="Elimina">&times;</button>
        </div>
    </template>

    <!-- Modale Categoria -->
    <div id="gestore-note-categoria-modale" class="gestore-note-modale-overlay" style="display: none;"
        data-action="create" data-category-id="">
        <div class="gestore-note-modale-contenuto gestore-note-categoria-contenuto">
            <h2 id="modale-categoria-titolo">Nuova categoria</h2>
            <div class="gestore-note-campo">
                <label for="modale-categoria-seleziona">Seleziona categoria</label>
                <select id="modale-categoria-seleziona">
                    <option value="">-- Seleziona categoria --</option>
                    <?php foreach ($categorie as $cat): ?>
                        <option value="<?php echo esc_attr($cat['id']); ?>">
                            <?php echo esc_html($cat['name']); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="gestore-note-campo">
                <label for="nuova-categoria-nome">Nome categoria</label>
                <input type="text" id="nuova-categoria-nome" placeholder="Es. Marketing, Supporto...">
            </div>
            <div class="gestore-note-campo">
                <label>Utenti abilitati</label>
                <div class="gn-utente-list-wrap">
                    <label class="gn-utente-select-all">
                        <input type="checkbox" id="nuova-categoria-seleziona-tutti"> Seleziona tutti
                    </label>
                    <div id="nuova-categoria-utenti" class="gn-utente-list">
                        <?php foreach ($utenti as $u): ?>
                            <label class="gn-utente-item">
                                <input type="checkbox" value="<?php echo esc_attr($u['id']); ?>"
                                    class="categoria-user-checkbox">
                                <?php echo esc_html($u['name']); ?>
                            </label>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
            <div class="gestore-note-modale-azioni">
                <button type="button" id="modale-categoria-annulla" class="button">Annulla</button>
                <button type="button" id="modale-categoria-salva" class="button button-primary">Salva categoria</button>
            </div>
        </div>
    </div>

    <!-- Modale Tag -->
    <div id="gestore-note-tag-modale" class="gestore-note-modale-overlay" style="display: none;">
        <div class="gestore-note-modale-contenuto gestore-note-categoria-contenuto">
            <h2>Nuova etichetta</h2>
            <div class="gestore-note-campo">
                <label for="nuova-tag-nome">Nome etichetta</label>
                <input type="text" id="nuova-tag-nome" placeholder="Es. Urgente, Clienti...">
            </div>
            <div class="gestore-note-modale-azioni">
                <button type="button" id="modale-tag-annulla" class="button">Annulla</button>
                <button type="button" id="modale-tag-salva" class="button button-primary">Salva etichetta</button>
            </div>
        </div>
    </div>

    <!-- Modale Nuova Nota -->
    <div id="gestore-note-modale-nota" class="gestore-note-modale-overlay" style="display: none;">
        <div class="gestore-note-modale-contenuto gestore-note-nota-contenuto">
            <h2>Nuova Nota</h2>
            <div class="gestore-note-campo">
                <label for="modale-nota-titolo">Titolo</label>
                <input type="text" id="modale-nota-titolo" placeholder="Es. Completare progetto...">
            </div>
            <div class="gestore-note-riga-doppia">
                <div class="gestore-note-campo">
                    <label for="modale-nota-categoria">Categoria</label>
                    <select id="modale-nota-categoria">
                        <option value="">-- Seleziona --</option>
                        <?php foreach ($categorie as $cat): ?>
                            <option value="<?php echo esc_attr($cat['id']); ?>">
                                <?php echo esc_html($cat['name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="gestore-note-campo">
                    <label for="modale-nota-priorita">Priorità</label>
                    <select id="modale-nota-priorita">
                        <option value="media" selected>Media</option>
                        <option value="bassa">Bassa</option>
                        <option value="alta">Alta</option>
                    </select>
                </div>
            </div>
            <div class="gestore-note-riga-doppia">
                <div class="gestore-note-campo">
                    <label for="modale-nota-assegnato">Assegnato a</label>
                    <select id="modale-nota-assegnato">
                        <option value="">-- Nessuno --</option>
                        <?php foreach ($utenti as $u): ?>
                            <option value="<?php echo esc_attr($u['id']); ?>">
                                <?php echo esc_html($u['name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="gestore-note-campo">
                    <label for="modale-nota-scadenza">Scadenza</label>
                    <input type="date" id="modale-nota-scadenza">
                </div>
            </div>
            <div class="gestore-note-riga-doppia">
                <div class="gestore-note-campo">
                    <label for="modale-nota-tag">Etichetta</label>
                    <select id="modale-nota-tag">
                        <option value="">-- Nessuna --</option>
                        <?php foreach ($tags as $tag): ?>
                            <option value="<?php echo esc_attr($tag['id']); ?>">
                                <?php echo esc_html($tag['name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="gestore-note-campo">
                    <label for="modale-nota-allegato">Allegato</label>
                    <input type="file" id="modale-nota-allegato">
                </div>
            </div>
            <div class="gestore-note-modale-azioni">
                <button type="button" id="modale-nota-annulla" class="button">Annulla</button>
                <button type="button" id="modale-nota-salva" class="button button-primary">Crea Nota</button>
            </div>
        </div>
    </div>

    <!-- Modale Modifica Nota -->
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

            <!-- SEZIONE SOTTOTASK -->
            <div class="gestore-note-campo">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <label style="margin: 0; font-weight: 600;">☑️ Checklist / Sottotask</label>
                    <span id="sottotask-counter"
                        style="font-size: 11px; color: #646970; background: #f0f0f1; padding: 2px 6px; border-radius: 10px;">0
                        completati</span>
                </div>
                <div class="gn-sottotask-wrapper">
                    <div id="modale-lista-sottotask"></div>
                    <div style="display: flex; gap: 6px; margin-top: 6px;">
                        <input type="text" id="input-nuovo-sottotask" placeholder="Aggiungi un nuovo passaggio..."
                            style="flex: 1; height: 32px; font-size: 12px; padding: 4px 10px;">
                        <button type="button" id="btn-aggiungi-sottotask" class="button button-secondary"
                            style="height: 32px; line-height: 30px; padding: 0 12px; font-size: 12px;">Aggiungi</button>
                    </div>
                </div>
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
                        <?php foreach ($utenti as $u): ?>
                            <option value="<?php echo esc_attr($u['id']); ?>">
                                <?php echo esc_html($u['name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="gestore-note-campo">
                    <label>Categoria</label>
                    <select id="modale-nota-categoria">
                        <option value="">-- Nessuna --</option>
                        <?php foreach ($categorie as $cat): ?>
                            <option value="<?php echo esc_attr($cat['id']); ?>">
                                <?php echo esc_html($cat['name']); ?>
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
                            <option value="<?php echo esc_attr($tag['id']); ?>">
                                <?php echo esc_html($tag['name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>

            <!-- 📜 SEZIONE STORICO ATTIVITÀ (AUDIT TRAIL) -->
            <div class="gestore-note-campo">
                <label style="font-weight: 600; margin-bottom: 4px;">📜 Storico Attività</label>
                <div id="modale-storico-log"
                    style="max-height: 100px; overflow-y: auto; background: #f6f7f7; padding: 8px; border-radius: 4px; border: 1px solid #ccd0d4;">
                </div>
            </div>

            <div class="gestore-note-modale-azioni">
                <button type="button" id="modale-btn-annulla" class="button">Annulla</button>
                <button type="button" id="modale-btn-salva" class="button button-primary">Salva modifiche</button>
            </div>
        </div>
    </div>
</div>