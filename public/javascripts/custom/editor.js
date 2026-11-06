// Shows the Requirement ID (field ID) next to the hierarchy number on each row of the Content Editor.
// insertContentEditorElement (apps/editor.js) does not render this field by default, so it is
// wrapped here rather than modifying the core app file. data.ID is populated automatically as long
// as the field ID is included in the "Requirements Overview" BOM view.
const baseInsertContentEditorElement = insertContentEditorElement;

insertContentEditorElement = function(elemPrevious, link, number, revision, parent, edge, level, data) {

    const elemTop = baseInsertContentEditorElement(elemPrevious, link, number, revision, parent, edge, level, data);

    const requirementId = data && data.ID;

    if(!isBlank(requirementId)) {
        $('<div></div>')
            .addClass('editor-item-id')
            .html(requirementId)
            .insertAfter(elemTop.find('.editor-item-number'));
    }

    // A genuinely new, blank child requirement - "+Click to insert next" always calls this
    // with link and data both null (unlike reused/copied/tree-populated rows, which always
    // carry one or the other). Offer a REQ CATEGORY choice here since createNewItems()
    // otherwise always applies the same fixed default (see the core file change next to it).
    if(isBlank(link) && isBlank(data)) {
        setRequirementCategoryOption(elemTop);
    }

    return elemTop;

};

function setRequirementCategoryOption(elemTop, originalCategoryLink) {

    if(isBlank(config.wsMain.newChildCategoryChoices)) return;

    const elemSelect = $('<select></select>')
        .addClass('editor-template-action')
        .addClass('action-reuse')
        .addClass('req-category-select')
        .attr('title', 'REQ CATEGORY for this new requirement')
        .appendTo(elemTop.find('.editor-item-header'));

    for(let choice of config.wsMain.newChildCategoryChoices) {
        elemSelect.append($('<option></option>').attr('value', choice.link).html(choice.label));
    }

    // When copying an existing item (setReuseCopyOption below), default to its actual REQ
    // CATEGORY rather than always the first configured choice - but only if that value is one
    // of the choices actually offered here (e.g. a copied Specification has no match, so it
    // falls back to the normal default).
    const hasMatch = !isBlank(originalCategoryLink) && config.wsMain.newChildCategoryChoices.some(function(choice) {
        return choice.link === originalCategoryLink;
    });
    if(hasMatch) elemSelect.val(originalCategoryLink);

    elemTop.attr('data-req-category-link', elemSelect.val());

    elemSelect.on('change', function() {
        elemTop.attr('data-req-category-link', $(this).val());
    });

}

// Adds a "This Structure" tab to Add From Library, so nodes already part of the currently
// open structure can be browsed and reused (dragged) elsewhere within the same structure -
// the built-in Search/Views/Bookmarks/Recents tabs only cover items outside the open structure.
$(document).ready(function() {

    $('<option></option>')
        .attr('value', 'structure')
        .html('This Structure')
        .appendTo('#add-select');

    $('<div></div>')
        .addClass('panel-content')
        .addClass('surface-level-2')
        .addClass('no-scrollbar')
        .addClass('hidden')
        .attr('id', 'add-structure')
        .appendTo('#add');

});

const baseSetAddExistingPanel = setAddExistingPanel;

setAddExistingPanel = function() {

    if($('#add-select').val() === 'structure') {

        $('#add .panel-content').addClass('hidden');

        insertBOM(links.root, {
            id             : 'add-structure',
            headerLabel    : 'This Structure',
            bomViewName    : config.wsMain.bomViewName,
            fieldsIn       : [ 'Title' ],
            hideTreeHeader : true,
            hideDescriptor : false,
            dragable       : (editMode !== 'template'),
            onDragStart    : 'onDragStart(event)',
            onDragEnd      : 'onAddDragEnd(event)'
        });

        $('#add-structure').removeClass('hidden');

    } else baseSetAddExistingPanel();

};

// Marks reused items (same REUSED field the Content Editor already checks) with a color
// accent in the Navigator tree, so multi-use requirements are visible without opening them.
// Also appends the Related Specification info (set by setRelatedSpecificationInfo below) into
// the header title line - it has to happen here rather than where it's first determined, since
// openEditor() overwrites #header-subtitle's content with .html(...) afterwards, which would
// wipe out an earlier insertion.
const baseAfterBOMCompletion = afterBOMCompletion;

afterBOMCompletion = function(id, data) {

    baseAfterBOMCompletion(id, data);

    markReusedItemsInNavigator();

    if((id === 'tree') && !isBlank(relatedSpecificationInfo)) {

        $('#header-subtitle').find('.related-specification').remove();

        const elemInfo = $('<span></span>')
            .addClass('related-specification')
            .html(' / ' + relatedSpecificationInfo.title)
            .appendTo('#header-subtitle');

        if(!isBlank(relatedSpecificationInfo.link)) {
            elemInfo.addClass('link').click(function(e) {
                e.stopPropagation();
                openItemByLink(relatedSpecificationInfo.link);
            });
        }

    }

};

function markReusedItemsInNavigator() {

    $('#tree').find('.tree-item-reused').removeClass('tree-item-reused').removeAttr('title');

    for(let index = 1; index < bomPartsList.length; index++) {

        let bomPart  = bomPartsList[index];
        let isReused = !isBlank(bomPart.details) && (bomPart.details[config.wsMain.itemsReused.fieldId] == config.wsMain.itemsReused.value);

        if(isReused) {
            $('#tree').find('.tree-item').eq(index - 1)
                .addClass('tree-item-reused')
                .attr('title', config.wsMain.itemsReused.title || 'Reused');
        }

    }

}

// Reused sync: REUSED is only ever set going forward by this app's own drag-and-drop
// reuse flow (see onEditorDrop / editExistingItems), so it won't reflect items that ended up
// linked in multiple places some other way. This lets the user manually reconcile REUSED
// against Fusion Manage's actual where-used count for every item in the open structure -
// deliberately not done automatically on every load, since that would mean one extra request
// per item (this structure alone has dozens). Started by the combined "Sync" button together
// with the specification sync (see runSync at the end of this file); reports through callback.
$(document).ready(function() {

    const labels = getSyncLabels();

    $('<div></div>')
        .attr('id', 'button-sync')
        .addClass('button')
        .attr('title', labels.tooltip)
        .text(labels.button)
        .insertBefore('#header-avatar')
        .click(function() {
            runSync();
        });

});

function syncReusedStatus(callback) {

    const items     = bomPartsList.slice(1).filter(function(bomPart) { return !isBlank(bomPart.link); });
    const batchSize = 5;

    let index        = 0;
    let countUpdated = 0;

    if(items.length === 0) { callback('Reused: no items to check.'); return; }

    function processBatch() {

        if(index >= items.length) {

            markReusedItemsInNavigator();
            callback('Reused: ' + countUpdated + ' of ' + items.length + ' item(s) updated.');
            return;

        }

        const batch = items.slice(index, index + batchSize);
        index += batch.length;

        const requests = batch.map(function(bomPart) {
            return $.get('/plm/details', { link : bomPart.link });
        });

        Promise.all(requests).then(function(responses) {

            const updateRequests = [];

            for(let i = 0; i < responses.length; i++) {

                const response = responses[i];
                const bomPart  = batch[i];

                if(response.error) continue;

                const isReusedActual = (response.data.whereUsed.count.value > 1);
                const isReusedField  = (bomPart.details[config.wsMain.itemsReused.fieldId] == config.wsMain.itemsReused.value);

                if(isReusedActual !== isReusedField) {

                    const newValue = isReusedActual ? config.wsMain.itemsReused.value : '';

                    updateRequests.push($.post('/plm/edit', {
                        link     : bomPart.link,
                        sections : config.wsMain.sections,
                        fields   : [{ fieldId : config.wsMain.itemsReused.fieldId, value : newValue }]
                    }));

                    bomPart.details[config.wsMain.itemsReused.fieldId] = newValue;
                    countUpdated++;

                }

            }

            Promise.all(updateRequests).then(processBatch);

        });

    }

    processBatch();

}

// insertMatchingBOMTreeNode (apps/editor.js) only gives the Navigator row a bare title, so a
// freshly reused item shows up there without its ID or reused marking until a full page
// refresh re-fetches the tree from the BOM view. Fix it in place instead: the Content Editor
// row built just before this runs (see onEditorDrop) already carries both, via the
// insertContentEditorElement wrap above and setReusedStatus in the core file, so mirror them
// onto the matching tree row directly rather than doing a disruptive full-editor refresh.
const baseInsertMatchingBOMTreeNode = insertMatchingBOMTreeNode;

insertMatchingBOMTreeNode = function(elemEditor, elemPrevious) {

    baseInsertMatchingBOMTreeNode(elemEditor, elemPrevious);

    const elemTreeItem = $('#tree-tbody').find('.id-' + elemEditor.attr('data-id')).first();

    const requirementId = elemEditor.find('.editor-item-id').first().html();

    const elemTitleCell = elemTreeItem.find('.tree-column-title');

    $('<span></span>')
        .addClass('tree-column-title-id')
        .html(isBlank(requirementId) ? '' : (requirementId + ' - '))
        .prependTo(elemTitleCell);

    // genTreeRow only gets a title, no field data, so the TITLE column of the BOM view stays
    // empty (the title lands in the descriptor column instead). Fill it from the editor row, as
    // text node since titles are user input. Rows inserted blank get it later by typing
    // (updateTreeItemTitle).
    const title = elemEditor.find('.editor-item-title').val();

    if(!isBlank(title) && (elemTitleCell.children('.tree-column-title-id').length === elemTitleCell.contents().length)) {
        elemTitleCell.append(document.createTextNode(title));
    }

    if(elemEditor.hasClass('reused')) {
        elemTreeItem.addClass('tree-item-reused').attr('title', config.wsMain.itemsReused.title || 'Reused');
    }

};

// storeNewBOMEdgeId (framework/utils.js) unconditionally does response.data.split(...) for
// every '/bom-add' response, assuming success (a string link). On a failed add - e.g.
// error.bom.duplicate, where response.data is the error array instead - this throws, which
// aborts the rest of the elements loop (leaving their 'link' pending class stuck) and skips
// the editBOMLinks() recursion that follows it. The stuck item then gets retried and fails
// with the same "Item already exists" error on every subsequent save, even after being fixed
// or removed. Full replacement (not a wrap) since the fix is inside the existing loop, not
// addable before/after it.
storeNewBOMEdgeId = function(action, elements, responses) {

    let index = 0;

    for(let element of elements) {

        let response = responses[index++];

        if((response.url === '/bom-add') && !response.error) {
            const edgeId = response.data.split('/bom-items/')[1];
            element.attr('data-parent', response.params.linkParent);
            element.attr('data-edgeid', edgeId);
        }

        element.removeClass(action.className);

    }

};

// Adds a drag handle to pinned items so they can be dragged into the Content Editor (reused)
// the same way library search results are - dropped onto a "Click to insert next" strip,
// handled by the existing onEditorDrop. Only the small handle icon is made draggable, not the
// whole pin card, since the card also hosts live-editable title/description fields (see
// togglePin/pinUpdateEditor in the core file) that a fully draggable container would interfere
// with (a click-and-drag gesture to select text would be read as starting a native drag).
const baseTogglePin = togglePin;

togglePin = function(elemClicked) {

    const elemEditor = elemClicked.closest('.editor-item');
    const willPin     = !elemEditor.hasClass('pinned');

    baseTogglePin(elemClicked);

    if(willPin) {

        const id      = elemEditor.attr('data-id');
        const elemPin = $('#pins-content').find('.pin.id-' + id);

        elemPin.addClass('content-item');

        $('<div></div>').prependTo(elemPin.find('.editor-item-actions'))
            .addClass('button')
            .addClass('icon')
            .addClass('icon-swap')
            .addClass('pin-drag-handle')
            .attr('title', 'Drag to insert this item elsewhere in the Content Editor')
            .attr('draggable', 'true')
            .attr('ondragstart', 'onDragStart(event)')
            .attr('ondragend', 'onAddDragEnd(event)');

    }

};

// Called from onEditorDrop (apps/editor.js) right after a dragged library/pin item is
// inserted, offering the same Reuse/Copy choice template mode already has per row (see
// .template-action there) - just simplified to two options and reusing its existing
// action-reuse/action-clone styling. "Reuse" is the default (today's behaviour: link to the
// same item). Switching to "Copy" clears data-link, which is enough for the existing
// saveChanges() classification to treat the row as a brand-new item and route it through
// createNewItems() instead of the link/reuse flow - the same mechanism template mode's own
// Clone option already relies on, no new save-time logic needed.
//
// A "Copy" is a brand-new item, so it needs the same REQ CATEGORY choice a genuinely new
// child row gets (setRequirementCategoryOption) - without it, createNewItems() (apps/editor.js)
// always fell back to the fixed newChildDefaultValues default (Project), ignoring the source
// item's actual type. Switching back to "Reuse" removes it again, since the original type is
// kept in that case.
function setReuseCopyOption(elemTop, link) {

    elemTop.attr('data-original-link', link);

    const wasPendingReuse = elemTop.hasClass('pending-reuse');
    const elemIdBox       = elemTop.find('.editor-item-id');
    const originalId      = elemIdBox.html();
    const elemTreeId      = $('#tree-tbody').find('.id-' + elemTop.attr('data-id')).find('.tree-column-title-id');
    const originalTreeId  = elemTreeId.html();

    const elemSelect = $('<select></select>')
        .addClass('editor-template-action')
        .addClass('action-reuse')
        .attr('title', 'Reuse links to the same item; Copy creates an independent duplicate')
        .appendTo(elemTop.find('.editor-item-header'));

    elemSelect.append('<option value="reuse">Reuse</option>');
    elemSelect.append('<option value="copy">Copy</option>');

    elemSelect.on('change', function() {

        const isCopy = ($(this).val() === 'copy');

        $(this).removeClass('action-reuse').removeClass('action-clone').addClass(isCopy ? 'action-clone' : 'action-reuse');

        if(isCopy) {

            elemTop.attr('data-link', '');
            elemTop.removeClass('pending-reuse');
            elemTop.removeClass('reused');
            elemTop.find('.editor-item-reuse').remove();
            elemIdBox.html('(new)');
            elemTreeId.html('(new) - ');

            if(elemTop.find('.req-category-select').length === 0) {
                $.get('/plm/details', { link : link }, function(response) {
                    // Guards against a fast Copy -> Reuse -> Copy toggle before this resolves,
                    // and against a duplicate select if that happened more than once.
                    if(elemSelect.val() !== 'copy') return;
                    if(elemTop.find('.req-category-select').length > 0) return;
                    if(response.error) {
                        showErrorMessage('Error', response.message);
                        setRequirementCategoryOption(elemTop);
                        return;
                    }
                    const originalCategoryLink = getSectionFieldValue(response.data.sections, 'REQUIREMENT_TYPE', '');
                    setRequirementCategoryOption(elemTop, originalCategoryLink);
                });
            }

        } else {

            elemTop.attr('data-link', elemTop.attr('data-original-link'));
            elemTop.toggleClass('pending-reuse', wasPendingReuse);
            setEditorItemReused(elemTop);
            elemIdBox.html(originalId);
            elemTreeId.html(originalTreeId);

            elemTop.find('.req-category-select').remove();
            elemTop.removeAttr('data-req-category-link');

        }

    });

}

// storeNewItemLinks (framework/utils.js) only stores the new item's link after creation
// (createNewItems' success path - covers both "Copy" and genuinely new rows), it never
// refreshes what's displayed. A "Copy" row shows the source item's ID until then (cleared to
// "(new)" by setReuseCopyOption above), and a brand-new row never shows an ID at all. Fetch
// and fill in the real one for each newly linked element, targeted rather than a full editor
// refresh (see the reverted editBOMLinks/openEditor attempt earlier).
const baseStoreNewItemLinks = storeNewItemLinks;

storeNewItemLinks = function(action, elements, responses) {

    baseStoreNewItemLinks(action, elements, responses);

    for(let element of elements) {

        const link = element.attr('data-link');

        if(isBlank(link)) continue;

        $.get('/plm/details', { link : link }, function(response) {

            if(response.error) return;

            const requirementId = getSectionFieldValue(response.data.sections, 'ID', '');

            if(isBlank(requirementId)) return;

            let elemIdBox = element.find('.editor-item-id');

            if(elemIdBox.length === 0) {
                elemIdBox = $('<div></div>').addClass('editor-item-id').insertAfter(element.find('.editor-item-number'));
            }

            elemIdBox.html(requirementId);

            updateChapterViewRowId(element, requirementId);

            const elemTreeId = $('#tree-tbody').find('.id-' + element.attr('data-id')).find('.tree-column-title-id');

            if(elemTreeId.length === 0) {
                $('<span></span>').addClass('tree-column-title-id').html(requirementId + ' - ')
                    .prependTo($('#tree-tbody').find('.id-' + element.attr('data-id')).find('.tree-column-title'));
            } else {
                elemTreeId.html(requirementId + ' - ');
            }

        });

    }

};

// Called from apps/editor.js right after links.root is resolved for a sub-item open (see the
// fix above it), using the sections already fetched for that same request - no extra call.
// Records the RELATED SPECIFICATION field (PARENT_SPECIFICATION) so the user can see which
// top-level node the currently open structure belongs to, since opening from deep inside a
// structure no longer makes that obvious just from the header title alone. Only stores the
// value here; the header title doesn't exist yet at this point in the load sequence, so it's
// rendered later by the afterBOMCompletion wrap above once openEditor() has set it.
let relatedSpecificationInfo = null;

function setRelatedSpecificationInfo(sections) {

    const title = getSectionFieldValue(sections, 'PARENT_SPECIFICATION', '', 'title');
    const link  = getSectionFieldValue(sections, 'PARENT_SPECIFICATION', '', 'link');

    relatedSpecificationInfo = isBlank(title) ? null : { title : title, link : link };

}

// Client-side mirror of lib_validateReqLevelHierarchy() in Fusion Manage
// (LIBRARY Scripts/REQ - Validate Requirement.js), which today only runs on the
// SUBMIT_FOR_REVIEW workflow transition of the Requirement Approval - too late to catch a
// wrongly nested item while still editing. Runs the same rank check on every save instead, so
// the same violation ("Component" ranked below its "Stakeholder"/"Product" parent) is caught
// immediately, blocking the save with the same message rather than duplicating the check
// only at approval time.
const baseSaveChanges = saveChanges;

saveChanges = function() {

    if(!isBlank(config.wsMain.reqLevelRank)) {

        const violations = [];

        $('#editor-content').children('.editor-item').not('.deleted').each(function() {

            const elemChild  = $(this);
            const elemParent = getParent(elemChild);

            if(elemParent === null) return;

            const childLevel  = elemChild.find('.field-id-REQ_LEVEL .picklist-input').first().val();
            const parentLevel = elemParent.find('.field-id-REQ_LEVEL .picklist-input').first().val();

            const childRank  = config.wsMain.reqLevelRank[childLevel];
            const parentRank = config.wsMain.reqLevelRank[parentLevel];

            if(isBlank(childRank) || isBlank(parentRank)) return;

            if(childRank < parentRank) {
                violations.push(
                    '"' + elemChild.find('.editor-item-title').val() + '" (' + childLevel + ') darf nicht unterhalb von "' +
                    elemParent.find('.editor-item-title').val() + '" (' + parentLevel + ') stehen.'
                );
            }

        });

        if(violations.length > 0) {
            showErrorMessage('REQ Level Hierarchy', violations.join('<br>'));
            return;
        }

    }

    baseSaveChanges();

};

// Advanced fields (insertAdvancedFields, apps/editor.js) only mark the row as changed via a
// 'keyup' listener - fine for text/number fields, but Single/Multiple Selection, Checkbox and
// Radio Button controls are driven by mouse clicks (selectPicklistValue etc. in
// contents/item.js), which never fire 'keyup'. Without the row-level .changed class,
// editExistingItems() (apps/editor.js) skips the item entirely on save - the individual field
// itself does get marked .field-editable.changed, but it's never picked up. This mirrors the
// exact click targets contents/item.js already uses to mark the field itself changed.
// A plain jQuery delegated listener on 'click' (bubble phase) does not work here: the
// picklist-option handler in contents/item.js calls e.stopPropagation() before doing its work,
// so the click never bubbles up to document. Using the DOM capture phase (the `true` third
// argument) runs this listener on the way down, before that stopPropagation() takes effect.
document.addEventListener('click', function(e) {

    const elemTarget = $(e.target).closest(
        '.editor-item-advanced .picklist-option, ' +
        '.editor-item-advanced .checkbox, ' +
        '.editor-item-advanced .radio-option, ' +
        '.editor-item-advanced .picklist-selected-item-remove, ' +
        '.editor-item-advanced .picklist-actions .icon-cancel'
    );

    if(elemTarget.length > 0) setChanged(elemTarget.closest('.editor-item'));

}, true);

// Requirements Dashboard: KPI tiles and charts for the currently open structure. Users found
// large specifications hard to oversee in the Content Editor alone. The dashboard takes the
// place of the Content Editor and its side panels while active, but the Navigator stays visible
// so tiles and bars can filter it. Toggle and panel are inserted via DOM here, not in
// editor.pug, to keep future Autodesk updates of the core files mergeable.
$(document).ready(function() {

    $('<div></div>')
        .attr('id', 'button-toggle-dashboard')
        .addClass('button')
        .addClass('with-toggle')
        .addClass('toggle-off')
        .attr('title', 'Click to toggle the dashboard of this structure on/off')
        .html('Dashboard')
        .insertBefore('#button-sync')
        .click(function() {
            toggleDashboard();
        });

    const elemDashboard = $('<div></div>')
        .attr('id', 'dashboard')
        .addClass('surface-level-1')
        .addClass('pos-abs-right')
        .appendTo('#main');

    const elemHeader = $('<div></div>').appendTo(elemDashboard)
        .addClass('panel-header');

    $('<div></div>').appendTo(elemHeader)
        .addClass('panel-title')
        .append($('<div></div>').addClass('panel-title-main').html('Dashboard'));

    const elemControls = $('<div></div>').appendTo(elemHeader)
        .attr('id', 'dashboard-controls')
        .addClass('panel-controls');

    // Upper levels of a structure are mostly chapters for grouping, the actual requirements sit
    // at the bottom (see process description, 5.3) - counting chapters would distort ratios
    // such as the validation coverage, so they can be left out.
    $('<div></div>').appendTo(elemControls)
        .attr('id', 'dashboard-only-leaves')
        .addClass('button')
        .addClass('with-toggle')
        .addClass('toggle-off')
        .attr('title', 'Count only requirements without sub requirements (leaves), not the chapters above them')
        .html('Only Leaves')
        .click(function() {
            $(this).toggleClass('toggle-on').toggleClass('toggle-off');
            clearDashboardFilter();
            renderDashboard();
        });

    $('<div></div>').appendTo(elemControls)
        .attr('id', 'dashboard-refresh')
        .addClass('button')
        .addClass('with-icon')
        .addClass('icon-refresh')
        .attr('title', 'Reload the saved state from Fusion Manage')
        .html('Refresh')
        .click(function() {
            loadDashboardData();
        });

    $('<div></div>').appendTo(elemDashboard)
        .attr('id', 'dashboard-content')
        .addClass('panel-content')
        .addClass('surface-level-1')
        .addClass('no-scrollbar');

});

function toggleDashboard() {

    $('body').toggleClass('dashboard-mode');
    $('#button-toggle-dashboard').toggleClass('toggle-on').toggleClass('toggle-off');

    if($('body').hasClass('dashboard-mode')) showDashboard();

}

// The dashboard always shows the saved state as returned by Fusion Manage, loaded through its
// own BOM view (config.dashboard.bomViewName) rather than reusing bomPartsList: the editor
// never refreshes bomPartsList after saving, and its own view lacks fields such as Change
// Pending. Unsaved edits are therefore excluded by design and only reported as a count.
let dashboardData = { link : '', parts : [], stale : true, loading : false, timestamp : null, approvalStates : {} };

function showDashboard() {

    if(dashboardData.stale || (dashboardData.link !== links.root)) loadDashboardData();
    else renderDashboard();

}
function loadDashboardData() {

    if(isBlank(config.dashboard)) return;
    if(dashboardData.loading) return;

    // Template, draft and empty modes have no saved structure of their own yet (in template
    // mode links.root even points at the template), so there is nothing meaningful to show.
    if((editMode !== 'existing') || isBlank(links.root)) {
        showDashboardMessage('The dashboard is available once this structure has been saved.');
        return;
    }

    const link = links.root;

    dashboardData.loading = true;
    clearDashboardFilter();
    showDashboardMessage('Loading saved state ...');

    $.get('/plm/bom-views-and-fields', { link : link }, function(response) {

        const bomViews = (response.error || !Array.isArray(response.data)) ? [] : response.data;
        const bomView  = bomViews.find(function(view) { return view.name === config.dashboard.bomViewName; });

        if(isBlank(bomView)) {
            dashboardData.loading = false;
            showDashboardMessage('BOM view "' + config.dashboard.bomViewName + '" could not be found.' + (response.error ? ' ' + response.message : ''));
            return;
        }

        // Same depth and revision bias as the Navigator, so both show the same revisions
        $.get('/plm/bom', {
            link            : link,
            depth           : settings.tree.depth,
            revisionBias    : settings.tree.revisionBias,
            viewId          : bomView.id,
            getBOMPartsList : true
        }, function(response) {

            dashboardData.loading = false;

            if(link !== links.root) return;

            if(response.error) {
                showDashboardMessage(response.message);
                return;
            }

            dashboardData.link      = link;
            dashboardData.parts     = response.data.bomPartsList.slice(1); // Index 0 is the root itself
            dashboardData.stale     = false;
            dashboardData.timestamp = new Date();

            loadDashboardApprovalStates(renderDashboard);

        });

    });

}
// "Change Pending" (WORKING_CHANGE_ORDER) names the open Requirement Approval of a row, but not
// its workflow state - which is what tells preparation (Definition) from review apart. The
// details of each distinct approval are fetched once (a structure usually has only a few).
// getBOMPartsList (routes/plm.js) keeps the raw field value in part.fields, which carries the
// link, while part.details only holds its title. Rows whose value has no link, or whose
// approval could not be read, end up with an unknown state rather than a guessed one.
function getDashboardChangeLink(part) {

    const field = part.fields.find(function(field) { return field.fieldId === config.dashboard.fieldIds.change; });
    const value = isBlank(field) ? null : field.value;

    return (!isBlank(value) && (typeof value === 'object') && !isBlank(value.link)) ? value.link : '';

}
function loadDashboardApprovalStates(callback) {

    dashboardData.approvalStates = {};

    if(!hasDashboardField(config.dashboard.fieldIds.change)) { callback(); return; }

    const links = [...new Set(dashboardData.parts.map(getDashboardChangeLink).filter(function(link) { return !isBlank(link); }))];

    if(links.length === 0) { callback(); return; }

    showDashboardMessage('Loading ' + links.length + ' Requirement Approval(s) ...');

    Promise.all(links.map(function(link) { return $.get('/plm/details', { link : link }); })).then(function(responses) {

        responses.forEach(function(response, index) {
            if(!response.error && !isBlank(response.data.currentState)) dashboardData.approvalStates[links[index]] = response.data.currentState.title;
        });

        callback();

    });

}
function getDashboardApprovalState(part) {

    if(isBlank(part.details[config.dashboard.fieldIds.change])) return null;    // No change pending

    return dashboardData.approvalStates[getDashboardChangeLink(part)] || '';    // '' = state unknown

}
function showDashboardMessage(message) {

    $('#dashboard-content').html('').append(
        $('<div></div>').addClass('dashboard-message').html(message)
    );

}
// The rows all counts and charts are based on: either every row, or only the leaves (see the
// Only Leaves toggle). The Navigator filter uses the same rows, so tile and filter always agree.
function getDashboardParts() {

    if($('#dashboard-only-leaves').hasClass('toggle-off')) return dashboardData.parts;

    return dashboardData.parts.filter(function(part) { return !part.hasChildren; });

}
function hasDashboardField(fieldId) {

    return !isBlank(fieldId) && (dashboardData.parts.length > 0) && dashboardData.parts[0].details.hasOwnProperty(fieldId);

}
function insertDashboardSection(elemParent, title) {

    $('<div></div>').appendTo(elemParent)
        .addClass('dashboard-section-title')
        .html(title);

    return $('<div></div>').appendTo(elemParent)
        .addClass('dashboard-tiles');

}
function renderDashboard() {

    if(isBlank(dashboardData.timestamp)) return;

    const elemContent  = $('#dashboard-content').html('');
    const countUnsaved = getDashboardUnsavedCount();
    const onlyLeaves   = $('#dashboard-only-leaves').hasClass('toggle-on');

    $('<div></div>').appendTo(elemContent)
        .addClass('dashboard-status')
        .html('Saved state of ' + dashboardData.timestamp.toLocaleTimeString() + ', ' + dashboardData.parts.length + ' requirement rows' +
            (onlyLeaves ? ', counting only the ' + getDashboardParts().length + ' leaves' : ''));

    if(countUnsaved > 0) {
        $('<div></div>').appendTo(elemContent)
            .addClass('dashboard-unsaved')
            .html(countUnsaved + ' unsaved change(s) in the Content Editor are not included. Save them to update the dashboard.');
    }

    // getBOMPartsList (routes/plm.js) sets every field of the view to null when empty, so a
    // key missing entirely means the field is not part of the BOM view - a configuration
    // error that would otherwise silently show up as zero counts.
    const fieldIds      = config.dashboard.fieldIds;
    const testFieldIds  = config.dashboard.testDefinitionFieldIds || [];
    const assessmentIds = (config.dashboard.assessmentFields || []).map(function(assessment) { return assessment.fieldId; });
    const missingFields = (dashboardData.parts.length === 0) ? [] : Object.values(fieldIds).concat(testFieldIds, assessmentIds).filter(function(fieldId) {
        return !hasDashboardField(fieldId);
    });

    if(missingFields.length > 0) {
        $('<div></div>').appendTo(elemContent)
            .addClass('dashboard-unsaved')
            .html('Missing in BOM view "' + config.dashboard.bomViewName + '": ' + missingFields.join(', '));
    }

    // Counted per row, the same way the Navigator lists them (a reused requirement appears
    // once per usage), so a Navigator filter by tile later shows exactly the number on it.
    const parts       = getDashboardParts();
    const countUnique = new Set(parts.map(function(part) { return part.link; })).size;

    // Archived is a target lifecycle of Requirement Approvals besides Released (process
    // description, 3.1.9 / 3.2.2). Such rows are neither done nor open, so they get their own
    // tile instead of inflating the open count.
    const isDone     = function(part) { return part.details[fieldIds.lifecycle] === config.dashboard.lifecycleDone; };
    const isArchived = function(part) { return part.details[fieldIds.lifecycle] === config.dashboard.lifecycleArchived; };
    const isOpen     = function(part) { return !isDone(part) && !isArchived(part); };
    const noLevel    = function(part) { return isBlank(part.details[fieldIds.level]); };

    // The filter functions are what a click on the tile applies to the Navigator; the total
    // tile has none, so clicking it clears an active filter instead.
    const elemStatus = insertDashboardSection(elemContent, 'Status');

    insertDashboardTile(elemStatus, 'Requirements', parts.length, countUnique + ' unique (reused ones only once)', '', null);
    insertDashboardFilterTile(elemStatus, parts, 'Done', 'Lifecycle ' + config.dashboard.lifecycleDone, 'dashboard-tile-done', isDone);
    insertDashboardFilterTile(elemStatus, parts, 'Open', 'Any other lifecycle', 'dashboard-tile-open', isOpen);
    insertDashboardFilterTile(elemStatus, parts, 'Archived', 'Lifecycle ' + config.dashboard.lifecycleArchived, '', isArchived);

    // Requirement Approvals (workspace 508) by workflow state, see config.dashboard.approvalStates
    if(hasDashboardField(fieldIds.change)) {

        const states  = config.dashboard.approvalStates;
        const inState = function(list) { return function(part) { return list.includes(getDashboardApprovalState(part)); }; };

        insertDashboardFilterTile(elemStatus, parts, 'In Preparation', 'Approval in ' + states.preparation.join(' / '), 'dashboard-tile-open', inState(states.preparation));
        insertDashboardFilterTile(elemStatus, parts, 'In Review', 'Approval in ' + states.review.join(' / '), 'dashboard-tile-open', inState(states.review));

        // A released row with a pending change is being revised (process description, 5.7)
        insertDashboardFilterTile(elemStatus, parts, 'In Revision', 'Released, change pending', '', function(part) {
            return isDone(part) && (getDashboardApprovalState(part) !== null);
        });

        const countUnknown = parts.filter(function(part) { return getDashboardApprovalState(part) === ''; }).length;

        if(countUnknown > 0) {
            insertDashboardFilterTile(elemStatus, parts, 'Change Pending, State Unknown', 'Approval state could not be read', 'dashboard-tile-warning', function(part) {
                return getDashboardApprovalState(part) === '';
            });
        }

    }

    // Validation, see process description: requirements are to be released before they get
    // validated (5.6), validations continue until all relevant requirements are covered
    // (4.1, step 6), and failed ones need a decision by project management (5.10).
    // "Validated" means a closed validation has written a result, whatever it is.
    const isValidated = function(part) { return !isBlank(part.details[fieldIds.validation]); };
    const isFailed    = function(part) { return part.details[fieldIds.validation] === config.dashboard.validationFailed; };

    const elemValidation = insertDashboardSection(elemContent, 'Validation');

    insertDashboardFilterTile(elemValidation, parts, 'Not Fulfilled', 'Latest result ' + config.dashboard.validationFailed + ', decision needed', 'dashboard-tile-warning', isFailed);
    insertDashboardFilterTile(elemValidation, parts, 'Released, Not Validated', 'Validation still to be done', 'dashboard-tile-open', function(part) {
        return isDone(part) && !isValidated(part);
    });
    insertDashboardFilterTile(elemValidation, parts, 'Validated, Not Released', 'Should be released before validation', 'dashboard-tile-warning', function(part) {
        return isValidated(part) && isOpen(part);
    });

    // Without a test definition a requirement cannot be validated - only shown if the test
    // definition fields are part of the dashboard's BOM view (they are long text fields, so
    // adding them makes the request larger).
    if((testFieldIds.length > 0) && testFieldIds.every(hasDashboardField)) {
        insertDashboardFilterTile(elemValidation, parts, 'Not Validatable', 'Released, but test definition incomplete', 'dashboard-tile-warning', function(part) {
            return isDone(part) && testFieldIds.some(function(fieldId) { return isBlank(part.details[fieldId]); });
        });
    }

    const elemQuality = insertDashboardSection(elemContent, 'Data Quality');

    insertDashboardFilterTile(elemQuality, parts, 'Without REQ Level', 'Required for the hierarchy check', 'dashboard-tile-warning', noLevel);

    // REQ Level, Source and Type are to be filled in by the user before release (process
    // description, appendix 6.1)
    insertDashboardFilterTile(elemQuality, parts, 'Incomplete', 'Not released, REQ Level, Source or Type empty', 'dashboard-tile-warning', function(part) {
        return isOpen(part) && [ fieldIds.level, fieldIds.source, fieldIds.type ].some(function(fieldId) { return isBlank(part.details[fieldId]); });
    });

    // Catalog requirements are meant to be reused only once released (5.5)
    insertDashboardFilterTile(elemQuality, parts, 'Catalog, Not Released', 'Reused before its release', 'dashboard-tile-warning', function(part) {
        return (part.details[fieldIds.category] === config.dashboard.categoryCatalog) && isOpen(part);
    });

    // Releasing a requirement releases all its sub requirements (5.6), so an unreleased row
    // below a released one points to a later change or an inconsistency worth checking.
    const parentOf = getDashboardParents();

    insertDashboardFilterTile(elemQuality, parts, 'Unreleased Below Released', 'Parent released, this row not', 'dashboard-tile-warning', function(part) {
        const parent = parentOf.get(part);
        return !isBlank(parent) && isDone(parent) && isOpen(part);
    });

    const elemCharts = $('<div></div>').appendTo(elemContent)
        .addClass('dashboard-charts');

    // Known levels first, in hierarchy order (same ranking as the save-time check)
    insertDashboardBarChart(elemCharts, 'dashboard-chart-level', 'Requirements by REQ Level', 'REQ Level', fieldIds.level,
        getDashboardGroups(parts, fieldIds.level, Object.keys(config.wsMain.reqLevelRank || {})));

    // LATEST_VALIDATION_RESULT is only written when a validation process gets closed (see
    // config.dashboard), so validations still running are not reflected - said in the title.
    const validationGroups = getDashboardGroups(parts, fieldIds.validation, config.dashboard.validationResults || [], '(not validated)');

    insertDashboardBarChart(elemCharts, 'dashboard-chart-validation', 'Latest Validation Result (closed validations only)', 'Validation', fieldIds.validation,
        validationGroups, validationGroups.map(function(group) { return getValidationColor(group.value); }));

    insertDashboardChapterChart(elemCharts, parts, validationGroups);

    insertDashboardBarChart(elemCharts, 'dashboard-chart-category', 'Requirements by REQ Category', 'REQ Category', fieldIds.category,
        getDashboardGroups(parts, fieldIds.category, config.dashboard.categoryOrder || []));

    if(hasDashboardField(fieldIds.validationDate)) {
        insertDashboardBarChart(elemCharts, 'dashboard-chart-validation-age', 'Age of Latest Validation', 'Validation age', '',
            getDashboardAgeGroups(parts, fieldIds.validationDate));
    }

    // Assessment picklists (Priority, Risk, Difficulty) - one chart per field configured and
    // present in the BOM view, nothing shown as long as none is configured
    for(let assessment of (config.dashboard.assessmentFields || [])) {
        if(hasDashboardField(assessment.fieldId)) {
            insertDashboardBarChart(elemCharts, 'dashboard-chart-assessment-' + assessment.fieldId, 'Requirements by ' + assessment.label, assessment.label, assessment.fieldId,
                getDashboardGroups(parts, assessment.fieldId, assessment.order || []));
        }
    }

}

// Groups rows by the age of a date field, in days. Each group carries its own filter, as
// age ranges cannot be matched by value equality like the other charts.
function getDashboardAgeGroups(parts, fieldId) {

    const now    = new Date();
    const ranges = [
        { label : 'Up to 30 days' , min : 0  , max : 30       },
        { label : '31 to 90 days' , min : 31 , max : 90       },
        { label : 'Over 90 days'  , min : 91 , max : Infinity }
    ];

    const getAge = function(part) {
        const date = new Date(part.details[fieldId]);
        return (isBlank(part.details[fieldId]) || isNaN(date)) ? null : Math.floor((now - date) / 86400000);
    };

    let groups = ranges.map(function(range) {
        return { label : range.label, filter : function(part) { const age = getAge(part); return (age !== null) && (age >= range.min) && (age <= range.max); } };
    });

    groups.push({ label : '(no date)', filter : function(part) { return getAge(part) === null; } });

    groups.forEach(function(group) { group.count = parts.filter(group.filter).length; });

    return groups.filter(function(group) { return group.count > 0; });

}

// Parent row of each row, from the tree order and levels (the root itself is not included)
function getDashboardParents() {

    let result  = new Map();
    let parents = [];

    for(let part of dashboardData.parts) {
        parents[part.level] = part;
        parents.length      = part.level + 1;
        if(part.level > 1) result.set(part, parents[part.level - 1]);
    }

    return result;

}

// Colors for the result values written by "REQ - Requirement Validations WF Actions.js";
// any other value gets the neutral bar color.
function getValidationColor(value) {

    const style = getComputedStyle(document.body);
    const names = { 'Success' : '--color-status-green', 'Conditional Success' : '--color-status-yellow', 'Failed' : '--color-status-red', '' : '--color-surface-level-4' };

    return style.getPropertyValue(names[value] || '--color-blue-500').trim();

}

// Validation progress per chapter (first level of the structure). The process description
// names this gap explicitly: there is no overview for project managers (5.8) and results do
// not cascade up the structure automatically (5.9). Shown as one doughnut with a chapter
// selector rather than one bar per chapter, which became an endless list in large structures:
// all chapters combined by default, a single chapter on selection.
function insertDashboardChapterChart(elemParent, parts, validationGroups) {

    const fieldId   = config.dashboard.fieldIds.validation;
    const inScope   = new Set(parts);
    let   chapters  = [];
    let   chapterOf = new Map();
    let   current   = null;

    // Rows come in tree order, so every row belongs to the last first-level row before it
    for(let part of dashboardData.parts) {
        if(part.level === 1) {
            current = { part : part, counts : validationGroups.map(function() { return 0; }) };
            chapters.push(current);
        }
        if(current !== null) chapterOf.set(part, current);
    }

    for(let part of parts) {
        const chapter = chapterOf.get(part);
        const value   = part.details[fieldId];
        const index   = validationGroups.findIndex(function(group) { return isBlank(value) ? (group.value === '') : (group.value === value); });
        if(!isBlank(chapter) && (index >= 0)) chapter.counts[index]++;
    }

    chapters = chapters.filter(function(chapter) { return chapter.counts.some(function(count) { return count > 0; }); });

    if(chapters.length === 0) return;

    // The revision suffix of the descriptor ("[REV:w]") only adds noise to the chapter names
    const labels = chapters.map(function(chapter) {
        const details = chapter.part.details;
        const label   = [ details.ID, details.TITLE ].filter(function(value) { return !isBlank(value); }).join(' - ') || chapter.part.title || '';
        return label.replace(/\s*\[REV:[^\]]*\]\s*$/, '');
    });

    const id         = 'dashboard-chart-chapters';
    const elemCanvas = insertDashboardChartBox(elemParent, id, 'Validation Progress per Chapter', 300);
    const elemSelect = $('<select></select>')
        .addClass('button')
        .addClass('dashboard-chart-select')
        .insertBefore(elemCanvas.parent())
        .append($('<option></option>').attr('value', '-1').html('All chapters (' + chapters.length + ')'));

    labels.forEach(function(label, index) {
        elemSelect.append($('<option></option>').attr('value', index).html(label));
    });

    const getSelected = function() { return Number(elemSelect.val()); };
    const getCounts   = function() {
        const selected = getSelected();
        return validationGroups.map(function(group, indexGroup) {
            return chapters.reduce(function(sum, chapter, indexChapter) {
                return ((selected < 0) || (selected === indexChapter)) ? sum + chapter.counts[indexGroup] : sum;
            }, 0);
        });
    };
    const getLabels   = function(counts) {
        return validationGroups.map(function(group, index) { return group.label + ' (' + counts[index] + ')'; });
    };

    loadChartLibrary(function() {

        if(!isBlank(dashboardCharts[id])) dashboardCharts[id].destroy();

        const colorFont = getComputedStyle(document.body).getPropertyValue('--color-font').trim();
        const counts    = getCounts();

        dashboardCharts[id] = new Chart(elemCanvas.get(0), {
            type : 'doughnut',
            data : {
                labels   : getLabels(counts),
                datasets : [{
                    data            : counts,
                    backgroundColor : validationGroups.map(function(group) { return getValidationColor(group.value); }),
                    borderWidth     : 0
                }]
            },
            options : {
                maintainAspectRatio : false,
                animation           : false,
                plugins             : { legend : { position : 'right', labels : { color : colorFont } } },
                onHover             : function(e, elements) {
                    e.native.target.style.cursor = (elements.length > 0) ? 'pointer' : 'default';
                },
                onClick             : function(e, elements) {
                    if(elements.length === 0) return;
                    const selected = getSelected();
                    const group    = validationGroups[elements[0].index];
                    const prefix   = (selected < 0) ? 'All chapters' : labels[selected];
                    applyDashboardFilter(prefix + ': ' + group.label, function(part) {
                        const value = part.details[fieldId];
                        if(!inScope.has(part)) return false;
                        if((selected >= 0) && (chapterOf.get(part) !== chapters[selected])) return false;
                        return (group.value === '') ? isBlank(value) : (value === group.value);
                    });
                }
            }
        });

        elemSelect.on('change', function() {
            const chart  = dashboardCharts[id];
            const counts = getCounts();
            chart.data.labels           = getLabels(counts);
            chart.data.datasets[0].data = counts;
            chart.update();
        });

    });

}

// Groups the rows by the value of one field: given values first in the given order, then any
// other value found (sorted), then empty ones - so values not yet known to the configuration
// still show up instead of being dropped.
function getDashboardGroups(parts, fieldId, order, emptyLabel) {

    let counts = {};
    let empty  = 0;

    for(let part of parts) {
        const value = part.details[fieldId];
        if(isBlank(value)) empty++;
        else counts[value] = (counts[value] || 0) + 1;
    }

    const others = Object.keys(counts).filter(function(value) { return !order.includes(value); }).sort();
    const groups = order.concat(others).filter(function(value) { return counts.hasOwnProperty(value); }).map(function(value) {
        return { label : value, value : value, count : counts[value] };
    });

    if(empty > 0) groups.push({ label : emptyLabel || '(empty)', value : '', count : empty });

    return groups;

}

// Chart.js is only needed while the dashboard is in use, so the library (the UMD build, see
// libs/chart.umd.js) is loaded on first use rather than on every editor start, and without
// touching editor.pug.
let dashboardCharts = {};

function loadChartLibrary(callback) {

    if(typeof Chart !== 'undefined') { callback(); return; }

    // The UMD build only sets the global Chart if no AMD loader (define.amd) is present on the
    // page, otherwise it registers there instead - report that rather than failing silently.
    $.ajax({ url : '/javascripts/libs/chart.umd.js', dataType : 'script', cache : true })
        .done(function() {
            if(typeof Chart === 'undefined') showErrorMessage('Dashboard', 'Chart library loaded, but Chart is not available globally.');
            else callback();
        })
        .fail(function() { showErrorMessage('Dashboard', 'Chart library could not be loaded.'); });

}
function insertDashboardChartBox(elemParent, id, title, height) {

    const elemChart = $('<div></div>').appendTo(elemParent)
        .addClass('dashboard-chart')
        .addClass('surface-level-2');

    $('<div></div>').appendTo(elemChart)
        .addClass('dashboard-chart-title')
        .html(title);

    const elemCanvas = $('<canvas></canvas>').attr('id', id);

    $('<div></div>').appendTo(elemChart)
        .addClass('dashboard-chart-canvas')
        .css('height', height + 'px')
        .append(elemCanvas);

    return elemCanvas;

}
function insertDashboardBarChart(elemParent, id, title, fieldLabel, fieldId, groups, colors) {

    const elemCanvas = insertDashboardChartBox(elemParent, id, title, 40 + (groups.length * 36));

    loadChartLibrary(function() {

        if(!isBlank(dashboardCharts[id])) dashboardCharts[id].destroy();

        // Colors are read from the theme variables, so the chart follows light and dark theme
        const style     = getComputedStyle(document.body);
        const colorFont = style.getPropertyValue('--color-font').trim();
        const colorBar  = style.getPropertyValue('--color-blue-500').trim();
        const colorGrid = style.getPropertyValue('--color-surface-level-4').trim();

        dashboardCharts[id] = new Chart(elemCanvas.get(0), {
            type : 'bar',
            data : {
                labels   : groups.map(function(group) { return group.label; }),
                datasets : [{ data : groups.map(function(group) { return group.count; }), backgroundColor : colors || colorBar }]
            },
            options : {
                indexAxis           : 'y',
                maintainAspectRatio : false,
                animation           : false,
                plugins             : { legend : { display : false } },
                onHover             : function(e, elements) {
                    e.native.target.style.cursor = (elements.length > 0) ? 'pointer' : 'default';
                },
                onClick             : function(e, elements) {
                    if(elements.length === 0) return;
                    const group = groups[elements[0].index];
                    applyDashboardFilter(fieldLabel + ': ' + group.label, group.filter || function(part) {
                        return (group.value === '') ? isBlank(part.details[fieldId]) : (part.details[fieldId] === group.value);
                    });
                },
                scales              : {
                    x : { beginAtZero : true, ticks : { precision : 0, color : colorFont }, grid : { color : colorGrid } },
                    y : { ticks : { color : colorFont }, grid : { display : false } }
                }
            }
        });

    });

}
// Tile whose value is the number of rows matching the filter. Warning tiles are only
// highlighted when there actually is something to look at.
function insertDashboardFilterTile(elemParent, parts, label, subtitle, className, filter) {

    const count = parts.filter(filter).length;

    if((className === 'dashboard-tile-warning') && (count === 0)) className = '';

    return insertDashboardTile(elemParent, label, count, subtitle, className, filter);

}
function insertDashboardTile(elemParent, label, value, subtitle, className, filter) {

    const elemTile = $('<div></div>').appendTo(elemParent)
        .addClass('dashboard-tile')
        .addClass('surface-level-2')
        .addClass(className || '')
        .attr('title', isBlank(filter) ? 'Click to clear the Navigator filter' : 'Click to show only these rows in the Navigator')
        .click(function() {
            if(isBlank(filter)) clearDashboardFilter();
            else applyDashboardFilter(label, filter);
        });

    $('<div></div>').appendTo(elemTile).addClass('dashboard-tile-value').html(value);
    $('<div></div>').appendTo(elemTile).addClass('dashboard-tile-label').html(label);
    $('<div></div>').appendTo(elemTile).addClass('dashboard-tile-subtitle').html(subtitle);

    return elemTile;

}

// Counts rows whose saved state differs from what the Content Editor shows, using the same
// rules saveChanges() (apps/editor.js) applies to decide what to send - read-only here, so
// nothing gets marked or modified. Rows added and deleted again without saving are ignored.
function getDashboardUnsavedCount() {

    let count = 0;

    $('#editor-content').children('.editor-item').each(function() {

        const elemItem = $(this);
        const link     = elemItem.attr('data-link');

        if(elemItem.hasClass('deleted')) {
            if(!isBlank(link)) count++;
        } else if(isBlank(link)) {
            count++;
        } else if(elemItem.hasClass('changed') || elemItem.hasClass('pending-reuse')) {
            count++;
        } else if(isBlank(elemItem.attr('data-edgeid')) || isBlank(elemItem.attr('data-parent'))) {
            count++;
        } else if(elemItem.attr('data-parent') !== getParentLink(elemItem)) {
            count++;
        } else if(elemItem.attr('data-number') !== elemItem.attr('data-position')) {
            count++;
        }

    });

    return count;

}

// Drill-down: restricts the Navigator to the rows behind a tile or bar, keeping their parent
// rows visible (dimmed) so the position in the structure stays recognizable. Rows are matched
// by edge id, which the Navigator and the dashboard's own BOM request share - unlike the item
// link it stays unique for requirements reused in several places. Rows added in the editor but
// not yet saved have no edge id and are hidden, since they are not part of the saved state.
// The filter deliberately stays active when the dashboard is closed, so the matching rows can
// be worked through in the Content Editor one by one.
function applyDashboardFilter(label, filter) {

    clearDashboardFilter();

    const edgeIds = new Set(getDashboardParts().filter(filter).map(function(part) { return String(part.edgeId); }));

    let parents      = [];
    let countMatches = 0;

    $('#tree-tbody').children('.tree-item').each(function() {

        const elemRow = $(this);
        const level   = Number(elemRow.attr('data-level'));

        parents[level] = elemRow;
        parents.length = level + 1;

        // Rows created in the editor and saved since loading only get their edge id on the
        // Content Editor row (storeNewBOMEdgeId), not on the Navigator row - fall back to it.
        const edgeId = elemRow.attr('data-edgeid') || $('#editor-content').children('.id-' + elemRow.attr('data-id')).attr('data-edgeid');

        if(edgeIds.has(edgeId)) {
            countMatches++;
            elemRow.addClass('dashboard-filter-match');
            for(let index = 1; index < level; index++) {
                if(!isBlank(parents[index])) parents[index].addClass('dashboard-filter-parent');
            }
        }

    });

    $('#tree').addClass('dashboard-filtered');

    const elemFilter = $('<div></div>')
        .attr('id', 'dashboard-filter')
        .addClass('button')
        .addClass('with-icon')
        .addClass('icon-close')
        .attr('title', 'Click to clear the dashboard filter')
        .html(label + ' (' + countMatches + ')')
        .click(function(e) {
            e.stopPropagation();
            clearDashboardFilter();
        });

    if($('#tree-controls').length > 0) elemFilter.prependTo('#tree-controls');
    else elemFilter.appendTo('#tree-header');

}
function clearDashboardFilter() {

    $('#dashboard-filter').remove();
    $('#tree').removeClass('dashboard-filtered');
    $('#tree-tbody').find('.dashboard-filter-match, .dashboard-filter-parent').removeClass('dashboard-filter-match').removeClass('dashboard-filter-parent');

}

// A click on a Navigator row while the dashboard is open means "take me there": close the
// dashboard first so the Content Editor is visible again, then let selectBOMItem
// (apps/editor.js) scroll to the matching row as usual.
const baseSelectBOMItem = selectBOMItem;

selectBOMItem = function(elemClicked) {

    if($('body').hasClass('dashboard-mode')) toggleDashboard();

    baseSelectBOMItem(elemClicked);

};

// updateAfterTemplateProcessing (apps/editor.js) only runs at the very end of a save run (see
// editBOMLinks), which makes it the one reliable "save finished" point to hook into. The
// dashboard is only marked stale here and reloads from Fusion Manage the next time it is
// shown, since the Save button is not reachable while the dashboard is open anyway.
const baseUpdateAfterTemplateProcessing = updateAfterTemplateProcessing;

updateAfterTemplateProcessing = function() {

    baseUpdateAfterTemplateProcessing();

    dashboardData.stale = true;

};

// Chapter View: the loaded structure grouped like the department's Excel - one tab per register
// (derived from the field configured as fieldIdRegister, currently REQ LEVEL), chapter headings
// (CHAPTER field) within, requirements below. Navigator, Content Editor and BOM stay untouched.
// Rows can be moved between chapters by drag & drop (allowMove); the new chapter is written into
// the row's CHAPTER Advanced Field in the Content Editor, so the regular "Save All Changes" stores
// it - no separate write path to Fusion Manage. New requirements (allowCreate) work the same way:
// a new Content Editor row with REQ Level and chapter preset. Toggle and panel are inserted via
// DOM here, not in editor.pug, like the dashboard above.
let chapterViewData      = null;      // Built in the afterBOMCompletion wrap below, null while not available
let chapterViewCapture   = null;      // Content Editor row ids collected while the core loop runs
let chapterViewSelection = new Set(); // uids of rows selected with Ctrl / Shift + click
let chapterViewLastClick = null;      // uid of the last selected row, start of a Shift + click range
let chapterViewDrag      = null;      // { register, uids } while rows are being dragged
let chapterViewCollapsed = new Set(); // register key + '|' + chapter key of collapsed chapters
let chapterViewEditUid   = null;      // uid of the row whose title and description are being edited

function getChapterViewConfig() {

    return (!isBlank(config.chapterView) && config.chapterView.enabled) ? config.chapterView : null;

}

$(document).ready(function() {

    const chapterConfig = getChapterViewConfig();

    if(chapterConfig === null) return;

    // Disabled until a structure has been loaded (not on #landing, #start or in template mode)
    $('<div></div>')
        .attr('id', 'button-toggle-chapter-view')
        .addClass('button')
        .addClass('with-toggle')
        .addClass('toggle-off')
        .addClass('disabled')
        .attr('title', 'Click to toggle the chapter view of the loaded structure on/off')
        .text(chapterConfig.labels.toggle)
        .insertBefore('#header-avatar')
        .click(function() {
            toggleChapterView();
        });

    const elemView = $('<div></div>')
        .attr('id', 'chapter-view')
        .addClass('surface-level-1')
        .addClass('pos-abs-right')
        .appendTo('#main');

    const elemHeader = $('<div></div>').appendTo(elemView)
        .addClass('panel-header');

    $('<div></div>').appendTo(elemHeader)
        .addClass('panel-title')
        .append($('<div></div>').addClass('panel-title-main').text(chapterConfig.labels.toggle));

    // Same save as in the Content Editor, whose button is hidden while this view is open
    const elemControls = $('<div></div>').appendTo(elemHeader)
        .addClass('panel-controls');

    $('<div></div>').appendTo(elemControls)
        .attr('id', 'chapter-view-pending')
        .addClass('chapter-view-pending');

    // Both act on the single selected row; a plain click on a row only selects it
    $('<div></div>').appendTo(elemControls)
        .attr('id', 'chapter-view-edit')
        .addClass('button')
        .addClass('with-icon')
        .addClass('icon-edit')
        .addClass('disabled')
        .text(chapterConfig.labels.edit)
        .click(function() {
            const row = getChapterViewSelectedRow();
            if((row !== null) && isChapterViewRowEditable(row)) openChapterViewEdit(row.uid);
        });

    $('<div></div>').appendTo(elemControls)
        .attr('id', 'chapter-view-open')
        .addClass('button')
        .addClass('with-icon')
        .addClass('icon-open')
        .addClass('disabled')
        .text(chapterConfig.labels.openInEditor)
        .click(function() {
            const row = getChapterViewSelectedRow();
            if((row !== null) && (row.editorId !== '')) jumpFromChapterView(row.editorId);
        });

    // Acts on all selected rows, unlike Edit and Open
    $('<div></div>').appendTo(elemControls)
        .attr('id', 'chapter-view-delete')
        .addClass('button')
        .addClass('with-icon')
        .addClass('icon-delete')
        .addClass('disabled')
        .toggleClass('hidden', !chapterConfig.allowDelete)
        .text(chapterConfig.labels.delete)
        .click(function() {
            deleteChapterViewRows(Array.from(chapterViewSelection));
        });

    $('<div></div>').appendTo(elemControls)
        .attr('id', 'chapter-view-save')
        .addClass('button')
        .addClass('default')
        .addClass('hidden')
        .text(chapterConfig.labels.save)
        .click(function() {
            saveChanges();
        });

    $('<div></div>').appendTo(elemView)
        .attr('id', 'chapter-view-content')
        .addClass('panel-content')
        .addClass('surface-level-1');

});

// The core loop of afterBOMCompletion (apps/editor.js) assigns data-id from the global nextId
// counter, not from the bomPartsList index - nextId keeps counting across inserts, so index and
// row id only match on a first load. Recording the ids of the rows actually created during that
// loop gives a reliable index -> row mapping for the jump into the Content Editor.
const baseChapterInsertContentEditorElement = insertContentEditorElement;

insertContentEditorElement = function(elemPrevious, link, number, revision, parent, edge, level, data) {

    const elemTop = baseChapterInsertContentEditorElement(elemPrevious, link, number, revision, parent, edge, level, data);

    if(chapterViewCapture !== null) chapterViewCapture.push(elemTop.attr('data-id'));

    return elemTop;

};

const baseChapterAfterBOMCompletion = afterBOMCompletion;

afterBOMCompletion = function(id, data) {

    if((id !== 'tree') || (getChapterViewConfig() === null)) {
        baseChapterAfterBOMCompletion(id, data);
        return;
    }

    let editorIds = [];

    chapterViewCapture = [];

    try {
        baseChapterAfterBOMCompletion(id, data);
    } finally {
        editorIds          = chapterViewCapture;
        chapterViewCapture = null;
    }

    // In template mode the tree shows the template, not the structure being created, so there
    // is no loaded state of its own to show (same reasoning as the dashboard).
    if(editMode === 'template') {
        chapterViewData = null;
    } else {
        // Exactly one row per entry after the root is expected; if not, the mapping cannot be
        // trusted and the jump is disabled rather than landing on a wrong row.
        if(editorIds.length !== (bomPartsList.length - 1)) {
            console.warn('Chapter View: ' + editorIds.length + ' editor rows for ' + (bomPartsList.length - 1) + ' BOM entries, jump to editor disabled');
            editorIds = [];
        }
        chapterViewData = buildChapterViewData(editorIds);
        chapterViewSelection.clear();
        chapterViewCollapsed.clear();
        chapterViewEditUid = null;
        renderChapterView();
    }

    $('#button-toggle-chapter-view').toggleClass('disabled', chapterViewData === null);

};

// Picklist values arrive as title string from getBOMPartsList (routes/plm.js), but may also be
// a { link, title } object - both are reduced to the display text.
function getChapterViewValue(details, fieldId) {

    if(isBlank(details) || isBlank(fieldId)) return '';

    const value = details[fieldId];

    if(isBlank(value)) return '';
    if(typeof value === 'object') return isBlank(value.title) ? '' : String(value.title);

    return String(value);

}

// getBOMPartsList sets every field of the view on every row (null if empty), the root included,
// so a key missing on the root means the field is not part of the BOM view at all.
function hasChapterViewField(fieldId) {

    return (bomPartsList.length > 0) && !isBlank(bomPartsList[0].details) && bomPartsList[0].details.hasOwnProperty(fieldId);

}

// Grouping ignores case and surrounding blanks, the first spelling found is displayed
function getChapterViewKey(label) {

    return label.trim().toLowerCase();

}

function buildChapterViewData(editorIds) {

    const chapterConfig = getChapterViewConfig();
    const registers     = chapterConfig.registers.map(function(register) {
        return { key : register.value, label : register.label, reqLevel : register.reqLevel || '', chapters : new Map(), count : 0 };
    });
    const unassigned    = { key : 'unassigned', label : chapterConfig.labels.unassigned, reqLevel : '', chapters : new Map(), count : 0 };
    const rows          = new Map();
    const seen          = new Set();

    // Register values are matched case-insensitively, anything else ends up unassigned
    const registerByValue = new Map(registers.map(function(register) { return [ getChapterViewKey(register.key), register ]; }));

    // Index 0 is the root (the specification itself) and not shown
    for(let index = 1; index < bomPartsList.length; index++) {

        const part = bomPartsList[index];

        // Rows without link are placeholders of a new structure, not part of the loaded state
        if(isBlank(part.link)) continue;

        // A reused requirement appears once per usage in the BOM, but only once here
        if(seen.has(part.link)) continue;
        seen.add(part.link);

        const register     = registerByValue.get(getChapterViewKey(getChapterViewValue(part.details, chapterConfig.fieldIdRegister))) || unassigned;
        const chapterLabel = getChapterViewValue(part.details, chapterConfig.fieldIdChapter).trim();
        const chapterKey   = getChapterViewKey(chapterLabel);

        if(!register.chapters.has(chapterKey)) {
            register.chapters.set(chapterKey, { key : chapterKey, label : chapterLabel, rows : [] });
        }

        // chapterKey and chapterLabel (the value written into CHAPTER) follow moves and renames in
        // this view, originalKey/originalLabel keep the saved state
        const row = {
            uid           : String(index),
            link          : part.link,
            details       : part.details,
            id            : getChapterViewValue(part.details, 'ID'),
            editorId      : editorIds[index - 1] || '',
            chapterKey    : chapterKey,
            chapterLabel  : chapterLabel,
            originalKey   : chapterKey,
            originalLabel : chapterLabel
        };

        register.chapters.get(chapterKey).rows.push(row);
        rows.set(row.uid, row);

        register.count++;

    }

    if(unassigned.count > 0) registers.push(unassigned);

    return {
        root          : links.root,
        registers     : registers,
        rows          : rows,
        canMove       : isChapterViewMoveEnabled(),
        canCreate     : isChapterViewCreateEnabled(),
        hasReqLevel   : hasChapterViewField(chapterConfig.fieldIdReqLevel),
        // Columns included, as a column missing in the BOM view would otherwise just stay empty
        missingFields : [ chapterConfig.fieldIdChapter, chapterConfig.fieldIdRegister ].concat(chapterConfig.columns.map(function(column) { return column.fieldId; })).filter(function(fieldId, index, fieldIds) {
            return (fieldIds.indexOf(fieldId) === index) && !hasChapterViewField(fieldId);
        })
    };

}

// Moving needs CHAPTER as editable Advanced Field: that is where the Content Editor's save picks
// the new value up (editExistingItems sends every .field-editable.changed of a changed row).
function isChapterViewMoveEnabled() {

    const chapterConfig = getChapterViewConfig();

    if(!chapterConfig.allowMove) return false;
    if(!hasChapterViewField(chapterConfig.fieldIdChapter)) return false;

    return (config.wsMain.advancedFields || []).some(function(field) {
        return (field.fieldId === chapterConfig.fieldIdChapter) && field.editable;
    });

}

// New requirements are appended directly below the root, which the core only allows while the
// root itself is WIP (see insertContentEditorElement); users sort them into the BOM afterwards.
// REQ Level and chapter are preset through their Advanced Fields, so both must be editable there.
function isChapterViewCreateEnabled() {

    const chapterConfig = getChapterViewConfig();
    const fieldIds      = [ chapterConfig.fieldIdChapter, chapterConfig.fieldIdRegister ];

    if(!chapterConfig.allowCreate) return false;
    if(bomPartsList.length === 0) return false;
    if(bomPartsList[0].revision !== 'WIP') return false;

    return fieldIds.every(function(fieldId) {
        return (config.wsMain.advancedFields || []).some(function(field) { return (field.fieldId === fieldId) && field.editable; });
    });

}

// All Content Editor rows of a requirement - several if it is reused. A requirement created here
// has no link before saving, so its single row is found by id instead.
function getChapterViewEditorRows(row) {

    if(isBlank(row.link)) return $('#editor-content').children('.editor-item.id-' + row.editorId).not('.deleted');

    return $('#editor-content').children('.editor-item').not('.deleted').filter(function() {
        return $(this).attr('data-link') === row.link;
    });

}

// Locked rows (released revision or lock field, see setLockedStatus) are skipped by the save
// anyway, so they cannot be moved - the change would otherwise get lost without notice.
function isChapterViewRowMovable(row) {

    if(!chapterViewData.canMove) return false;

    const elemEditors = getChapterViewEditorRows(row);
    const fieldClass  = '.field-id-' + getChapterViewConfig().fieldIdChapter + '.field-editable';

    if(elemEditors.length === 0) return false;

    return elemEditors.toArray().every(function(elem) {
        return !$(elem).hasClass('locked') && ($(elem).find('.editor-item-advanced ' + fieldClass + ' input').length > 0);
    });

}

// Title and description are item-level like the chapter, so editing follows the same rules as
// moving: all editor rows of the requirement must exist and none may be locked.
function isChapterViewRowEditable(row) {

    if(!getChapterViewConfig().allowEdit) return false;

    const elemEditors = getChapterViewEditorRows(row);

    return (elemEditors.length > 0) && elemEditors.toArray().every(function(elem) { return !$(elem).hasClass('locked'); });

}

// Unsaved: moved to another chapter, edited here, created here (originalKey null) or deleted
function isChapterViewRowPending(row) {

    return isChapterViewChapterPending(row) || (row.edited === true) || isChapterViewRowDeleted(row);

}

// The chapter value differs from the saved one: another chapter, or the same one in another
// spelling (renamed, e.g. "projekt" -> "Projekt", which the grouping key does not tell apart)
function isChapterViewChapterPending(row) {

    return (row.chapterKey !== row.originalKey) || (row.chapterLabel !== row.originalLabel);

}

// Like getChapterViewEditorRows, but including rows marked deleted
function getChapterViewEditorRowsAll(row) {

    if(isBlank(row.link)) return $('#editor-content').children('.editor-item.id-' + row.editorId);

    return $('#editor-content').children('.editor-item').filter(function() {
        return $(this).attr('data-link') === row.link;
    });

}
function isChapterViewRowDeleted(row) {

    const elemEditors = getChapterViewEditorRowsAll(row);

    return (elemEditors.length > 0) && elemEditors.toArray().every(function(elem) { return $(elem).hasClass('deleted'); });

}

// Deleting removes the BOM link to the parent on save (removeBOMItems), so the parent's BOM must
// be changeable: not locked, or the root while it is WIP - otherwise the save would fail.
function isChapterViewRowDeletable(row) {

    if(!getChapterViewConfig().allowDelete) return false;

    const elemEditors = getChapterViewEditorRows(row);

    if(elemEditors.length === 0) return false;

    return elemEditors.toArray().every(function(elem) {
        const elemParent = getParent($(elem));
        return (elemParent === null) ? (bomPartsList[0].revision === 'WIP') : !elemParent.hasClass('locked');
    });

}

// Uses the Content Editor's own delete on every row of the requirement in this structure (all
// uses if reused), so saving removes the BOM links as if deleted there. A requirement created
// here and not saved yet is also cleared (as the editor's "delete forever"), the save skips it.
// Only asked to confirm when more than the row itself is affected: sub requirements, which the
// editor deletes along, or further uses of a reused requirement. Undo is possible until saved.
function deleteChapterViewRows(uids) {

    const labels = getChapterViewConfig().labels;

    for(let uid of uids) {

        const row = chapterViewData.rows.get(uid);

        if(isBlank(row) || isChapterViewRowDeleted(row) || !isChapterViewRowDeletable(row)) continue;

        const elemEditors   = getChapterViewEditorRows(row);
        const countChildren = elemEditors.toArray().reduce(function(sum, elem) { return sum + getChildren($(elem)).length; }, 0);
        const title         = row.details.TITLE || row.id;

        if((countChildren > 0) && !confirm(labels.confirmChildren.replace('{title}', title).replace('{count}', countChildren))) continue;
        if((elemEditors.length > 1) && !confirm(labels.confirmReused.replace('{title}', title).replace('{count}', elemEditors.length))) continue;

        elemEditors.each(function() {
            deleteContentEditorElement($(this));
            if(isBlank(row.link)) clearContentEditorElement($(this));
        });

    }

    if(uids.includes(chapterViewEditUid)) chapterViewEditUid = null;

    clearChapterViewSelection();
    renderChapterView();

}
function undoChapterViewDelete(row) {

    getChapterViewEditorRowsAll(row).each(function() {
        const elemUndo = $(this).find('.editor-item-recover .icon-undo').first();
        if(elemUndo.length > 0) undeleteContentEditorElement(elemUndo);
    });

    renderChapterView();

}

// undeleteContentEditorElement (apps/editor.js) adds 'deleted' to the Navigator row instead of
// removing it (addClass where removeClass is meant), so an undone row stayed marked deleted in the
// Navigator. Corrected here after the core function ran; the Content Editor row itself is fine.
const baseUndeleteContentEditorElement = undeleteContentEditorElement;

undeleteContentEditorElement = function(elemClicked) {

    const elemEditor = elemClicked.closest('.editor-item');

    baseUndeleteContentEditorElement(elemClicked);

    getMatchByIndex(elemEditor).removeClass('deleted');

};

function getChapterViewPendingCount() {

    if(chapterViewData === null) return 0;

    return Array.from(chapterViewData.rows.values()).filter(isChapterViewRowPending).length;

}

function renderChapterView() {

    const chapterConfig = getChapterViewConfig();
    const labels        = chapterConfig.labels;
    const elemContent   = $('#chapter-view-content');
    const scrollTop     = elemContent.find('.chapter-view-tab-contents').scrollTop() || 0;

    elemContent.html('');

    if(chapterViewData === null) return;

    removeChapterViewDeletedRows();

    // The view shows the state loaded with the structure, edits in the Content Editor are not
    // reflected until saved and reloaded - said once on top instead of reloading automatically.
    $('<div></div>').appendTo(elemContent)
        .addClass('chapter-view-hint')
        .text(labels.staleHint + (chapterViewData.canMove ? ' ' + labels.moveHint : ''));

    for(let fieldId of chapterViewData.missingFields) {
        $('<div></div>').appendTo(elemContent)
            .addClass('chapter-view-missing')
            .text(labels.missingField + ': ' + fieldId);
    }

    if(chapterConfig.allowMove && !chapterViewData.canMove && (chapterViewData.missingFields.length === 0)) {
        $('<div></div>').appendTo(elemContent)
            .addClass('chapter-view-missing')
            .text(labels.notEditable.replace('{field}', chapterConfig.fieldIdChapter));
    }

    if(chapterConfig.allowCreate && !chapterViewData.canCreate && (bomPartsList.length > 0) && (bomPartsList[0].revision !== 'WIP')) {
        $('<div></div>').appendTo(elemContent)
            .addClass('chapter-view-missing')
            .text(labels.rootNotWorking);
    }

    updateChapterViewPending();

    const registers = chapterViewData.registers.filter(function(register) {
        return !chapterConfig.hideEmptyRegisters || (register.count > 0);
    });

    if(registers.length === 0) return;

    // Framework tabs (framework/styles.css); enableTabs() only runs on page load, so the clicks
    // are bound here and handed to clickTab(), which matches tab and content by index.
    const elemTabs = $('<div></div>').appendTo(elemContent)
        .addClass('tabs')
        .addClass('chapter-view-tabs')
        .attr('data-tab-group', 'chapter-view-tab');

    const elemTabContents = $('<div></div>').appendTo(elemContent)
        .addClass('chapter-view-tab-contents');

    for(let register of registers) {

        $('<div></div>').appendTo(elemTabs)
            .addClass('chapter-view-tab-label')
            .toggleClass('chapter-view-tab-empty', register.count === 0)
            .attr('data-register', register.key)
            .text(register.label + ' (' + register.count + ')')
            .click(function() {
                clearChapterViewSelection();
                clickTab($(this));
                storeChapterViewTab($(this).attr('data-register'));
            });

        const elemTabContent = $('<div></div>').appendTo(elemTabContents)
            .addClass('chapter-view-tab')
            .addClass('hidden');

        // An empty register still offers "No Chapter" to create the first requirement in it
        if(register.count === 0) {
            $('<div></div>').appendTo(elemTabContent)
                .addClass('chapter-view-empty')
                .text(labels.emptyRegister);
            if(!chapterViewData.canCreate || (register.key === 'unassigned')) continue;
        }

        if(chapterViewData.canMove) insertChapterViewNewChapter(elemTabContent, register);

        for(let chapter of getChapterViewChapters(register)) insertChapterViewChapter(elemTabContent, register, chapter);

    }

    const stored  = getStoredChapterViewTab();
    let   elemTab = elemTabs.children().filter(function() { return $(this).attr('data-register') === stored; });

    if(elemTab.length === 0) elemTab = elemTabs.children().first();

    clickTab(elemTab);

    // Re-rendered after every move, so keep the reading position
    elemTabContents.scrollTop(scrollTop);

    updateChapterViewActions();

}

function updateChapterViewPending() {

    const count = getChapterViewPendingCount();

    $('#chapter-view-pending').text((count > 0) ? getChapterViewConfig().labels.pending.replace('{count}', count) : '');
    $('#chapter-view-save').toggleClass('hidden', (chapterViewData === null) || !chapterViewData.canMove);

}

// Chapters in configured order, requirements without chapter always last. While moving or
// creating is enabled, "No Chapter" is always there: as drop target to clear the chapter of a
// row, and to create a requirement without chapter (also in an empty register).
function getChapterViewChapters(register) {

    const chapterConfig = getChapterViewConfig();
    let   chapters      = Array.from(register.chapters.values()).filter(function(chapter) { return chapter.key !== ''; });
    const noChapter     = register.chapters.get('');

    if(chapterConfig.chapterSort === 'alphanumeric') {
        chapters.sort(function(a, b) { return a.label.localeCompare(b.label, undefined, { numeric : true }); });
    }

    const isTarget      = chapterViewData.canMove || chapterViewData.canCreate;

    if(!isBlank(noChapter) && ((noChapter.rows.length > 0) || isTarget)) {
        chapters.push({ key : '', label : chapterConfig.labels.noChapter, rows : noChapter.rows, isNoChapter : true });
    } else if(isBlank(noChapter) && isTarget) {
        register.chapters.set('', { key : '', label : '', rows : [] });
        chapters.push({ key : '', label : chapterConfig.labels.noChapter, rows : register.chapters.get('').rows, isNoChapter : true });
    }

    return chapters;

}

// Requirements by ID, those without ID at the end in loaded order
function sortChapterViewRows(rows) {

    return rows.slice().sort(function(a, b) {
        if(a.id === '') return (b.id === '') ? 0 : 1;
        if(b.id === '') return -1;
        return a.id.localeCompare(b.id, undefined, { numeric : true });
    });

}

// A chapter only exists through the requirements carrying it, so a new one is first created
// empty here as drop target; it is saved with the first row moved onto it.
function insertChapterViewNewChapter(elemParent, register) {

    const labels   = getChapterViewConfig().labels;
    const elemNew  = $('<div></div>').appendTo(elemParent).addClass('chapter-view-new');
    const elemName = $('<input></input>').appendTo(elemNew)
        .addClass('chapter-view-new-name')
        .attr('placeholder', labels.newChapter);

    const addChapter = function() {
        const label = elemName.val().trim();
        const key   = getChapterViewKey(label);
        if(label === '') return;
        if(!register.chapters.has(key)) register.chapters.set(key, { key : key, label : label, rows : [] });
        chapterViewCollapsed.delete(register.key + '|' + key);
        renderChapterView();
    };

    elemName.on('keydown', function(e) { if(e.key === 'Enter') addChapter(); });

    $('<div></div>').appendTo(elemNew)
        .addClass('button')
        .text(labels.addChapter)
        .click(addChapter);

}

function insertChapterViewChapter(elemParent, register, chapter) {

    const chapterConfig = getChapterViewConfig();
    const labels        = chapterConfig.labels;
    const collapseKey   = register.key + '|' + chapter.key;

    const elemChapter = $('<div></div>').appendTo(elemParent)
        .addClass('chapter-view-chapter')
        .toggleClass('chapter-view-chapter-none', chapter.isNoChapter === true)
        .toggleClass('collapsed', chapterViewCollapsed.has(collapseKey));

    const elemHeader = $('<div></div>').appendTo(elemChapter)
        .addClass('chapter-view-chapter-header')
        .append($('<span></span>').addClass('icon').addClass(chapterViewCollapsed.has(collapseKey) ? 'icon-chevron-right' : 'icon-chevron-down').addClass('chapter-view-chapter-toggle'))
        .append($('<span></span>').addClass('chapter-view-chapter-title').text(chapter.label))
        .append($('<span></span>').addClass('chapter-view-chapter-count').text('(' + chapter.rows.length + ')'))
        .click(function() {
            elemChapter.toggleClass('collapsed');
            if(elemChapter.hasClass('collapsed')) chapterViewCollapsed.add(collapseKey); else chapterViewCollapsed.delete(collapseKey);
            $(this).find('.chapter-view-chapter-toggle').toggleClass('icon-chevron-down').toggleClass('icon-chevron-right');
        });

    // Renaming writes CHAPTER like moving does, so it needs the same editable field
    if(chapterViewData.canMove && (chapter.isNoChapter !== true)) {
        $('<span></span>').insertAfter(elemHeader.children('.chapter-view-chapter-count'))
            .addClass('icon')
            .addClass('icon-edit')
            .addClass('chapter-view-chapter-rename')
            .attr('title', labels.renameChapter)
            .click(function(e) {
                e.stopPropagation();
                startChapterViewRename(elemHeader, register, chapter);
            });
    }

    if(chapterViewData.canMove) insertChapterViewDropTarget(elemChapter, register, chapter.key);

    if(chapter.rows.length > 0) insertChapterViewTable(elemChapter, register, chapter);

    // Not in "Unassigned", which has no REQ Level to preset
    if(chapterViewData.canCreate && (register.key !== 'unassigned')) insertChapterViewCreate(elemChapter, register, chapter);

}

function insertChapterViewTable(elemChapter, register, chapter) {

    const chapterConfig = getChapterViewConfig();
    const labels        = chapterConfig.labels;

    const elemTable = $('<table></table>').appendTo(elemChapter)
        .addClass('chapter-view-table');

    const elemHead = $('<tr></tr>').appendTo($('<thead></thead>').appendTo(elemTable));

    $('<th></th>').appendTo(elemHead).addClass('chapter-view-col-check');

    for(let column of chapterConfig.columns) {
        $('<th></th>').appendTo(elemHead)
            .addClass('chapter-view-col-' + column.fieldId)
            .text(column.label);
    }

    $('<th></th>').appendTo(elemHead).addClass('chapter-view-col-open');

    const elemBody = $('<tbody></tbody>').appendTo(elemTable);

    for(let row of sortChapterViewRows(chapter.rows)) {

        const isMovable   = isChapterViewRowMovable(row);
        const isEditable  = isChapterViewRowEditable(row);
        const isDeleted   = isChapterViewRowDeleted(row);
        const elemRow     = $('<tr></tr>').appendTo(elemBody)
            .addClass('chapter-view-row')
            .toggleClass('chapter-view-row-nolink', row.editorId === '')
            .toggleClass('chapter-view-row-deleted', isDeleted)
            .toggleClass('chapter-view-row-pending', isChapterViewRowPending(row))
            .toggleClass('selected', chapterViewSelection.has(row.uid))
            .attr('data-uid', row.uid)
            .attr('data-editor-id', row.editorId);

        // Click selects (Ctrl / Shift + click several), double-click edits; jumping into the
        // Content Editor is done by the open icon or the "Open in Editor" button
        elemRow.click(function(e) {
            selectChapterViewRow($(this), e.ctrlKey || e.metaKey, e.shiftKey);
        });

        if(isEditable) {
            elemRow.dblclick(function() {
                openChapterViewEdit(row.uid);
            });
        }

        if(isMovable) insertChapterViewDragSource(elemRow, register, row);

        const elemCheck = $('<td></td>').appendTo(elemRow).addClass('chapter-view-col-check');
        const actual    = getChapterViewValue(row.details, chapterConfig.fieldIdReqLevel);

        // Deleted rows offer undo where the delete was made (a row removed together with its
        // parent is restored by undoing the parent)
        if(isDeleted) {
            const canUndo = getChapterViewEditorRowsAll(row).find('.editor-item-recover .icon-undo').length > 0;
            $('<span></span>').appendTo(elemCheck)
                .addClass('icon')
                .addClass(canUndo ? 'icon-undo' : 'icon-delete')
                .addClass(canUndo ? 'chapter-view-row-undo' : 'chapter-view-row-lock')
                .attr('title', canUndo ? labels.undoDelete : labels.deletedByParent)
                .click(function(e) {
                    if(!canUndo) return;
                    e.stopPropagation();
                    undoChapterViewDelete(row);
                });
        } else if((chapterViewData.canMove || chapterConfig.allowEdit) && !isMovable && !isEditable) {
            $('<span></span>').appendTo(elemCheck)
                .addClass('icon')
                .addClass('icon-lock')
                .addClass('chapter-view-row-lock')
                .attr('title', labels.locked);
        }

        // Plausibility only, if a register defines reqLevel: the expected REQ Level is shown, never
        // corrected. Not configured while the registers are derived from REQ Level itself.
        if(chapterViewData.hasReqLevel && (register.reqLevel !== '') && (actual !== register.reqLevel)) {
            elemRow.addClass('chapter-view-row-mismatch');
            $('<span></span>').appendTo(elemCheck)
                .addClass('icon')
                .addClass('icon-warning')
                .attr('title', labels.levelMismatch.replace('{expected}', register.reqLevel).replace('{actual}', actual || '-'));
        }

        for(let column of chapterConfig.columns) {
            const value = ((column.fieldId === 'ID') && (row.id === '') && isBlank(row.link)) ? labels.newId : getChapterViewValue(row.details, column.fieldId);
            const text  = getChapterViewText(value);
            $('<td></td>').appendTo(elemRow)
                .addClass('chapter-view-col-' + column.fieldId)
                .attr('title', text)
                .text(text);
        }

        const elemOpen = $('<td></td>').appendTo(elemRow).addClass('chapter-view-col-open');

        if(row.editorId !== '') {
            $('<span></span>').appendTo(elemOpen)
                .addClass('icon')
                .addClass('icon-open')
                .attr('title', labels.openInEditor)
                .click(function(e) {
                    e.stopPropagation();
                    jumpFromChapterView(row.editorId);
                });
        }

        if(chapterViewEditUid === row.uid) insertChapterViewEdit(elemBody, row, chapterConfig.columns.length + 2);

    }

}

// Edit area below the row: title and description, the latter in the same rich text editor as
// the Content Editor, so formatting is kept. Start values are taken from the editor row rather
// than the loaded state, so unsaved edits made in the Content Editor are not overwritten.
function openChapterViewEdit(uid) {

    chapterViewEditUid = uid;
    chapterViewSelection.clear();
    chapterViewSelection.add(uid);
    chapterViewLastClick = uid;

    renderChapterView();

    $('#chapter-view-content').find('.chapter-view-edit-title').first().focus();

}
function closeChapterViewEdit() {

    chapterViewEditUid = null;
    renderChapterView();

}
function insertChapterViewEdit(elemBody, row, colspan) {

    const labels     = getChapterViewConfig().labels;
    const elemEditor = getChapterViewEditorRows(row).first();
    const elemCell   = $('<td></td>')
        .attr('colspan', colspan)
        .appendTo($('<tr></tr>').addClass('chapter-view-edit-row').appendTo(elemBody));

    const elemEdit = $('<div></div>').appendTo(elemCell).addClass('chapter-view-edit');

    const elemTitle = $('<input></input>').appendTo(elemEdit)
        .addClass('chapter-view-edit-title')
        .attr('placeholder', labels.title)
        .val(elemEditor.find('.editor-item-title').first().val());

    const elemDescription = $('<div></div>').appendTo(elemEdit).addClass('chapter-view-edit-description');

    insertRichTextEditor(elemDescription, elemEditor.find('.editor-item-description .rte-input').first().html(), null, 'chapter-view-edit');

    const elemFields = insertChapterViewEditFields(elemEdit, elemEditor);

    const elemActions = $('<div></div>').appendTo(elemEdit).addClass('chapter-view-edit-actions');

    const apply = function() {
        const title = elemTitle.val().trim();
        if(title === '') { elemTitle.addClass('chapter-view-input-missing').focus(); return; }
        applyChapterViewEdit(row, title, elemDescription.find('.rte-input').html(), getChapterViewEditFieldChanges(elemFields));
    };

    $('<div></div>').appendTo(elemActions).addClass('button').addClass('default').text(labels.apply).click(apply);
    $('<div></div>').appendTo(elemActions).addClass('button').text(labels.cancel).click(closeChapterViewEdit);

    // No stopPropagation on clicks here: picklists open through the framework's click handler on
    // document (framework/utils.js); the edit row itself has no click handlers to shield from
    elemTitle.on('keydown', function(e) {
        if(e.key === 'Enter') apply();
        if(e.key === 'Escape') closeChapterViewEdit();
    });

}

// Further fields (editFields, e.g. Source, Type, Priority) with the same controls as in Advanced
// Mode (insertField, incl. picklist search). Only fields editable in the editor row are offered;
// their current value is read from there, not from the loaded state. Multiple selections are not
// supported here. Own container class, as .editor-item-advanced is hidden outside Advanced Mode.
function insertChapterViewEditFields(elemEdit, elemEditor) {

    const elemFields = $('<div></div>').appendTo(elemEdit).addClass('chapter-view-edit-fields');

    for(let fieldId of (getChapterViewConfig().editFields || [])) {

        const field      = (config.wsMain.advancedFields || []).find(function(field) { return field.fieldId === fieldId; });
        const elemSource = elemEditor.find('.editor-item-advanced .field-id-' + fieldId + '.field-editable').first();

        if(isBlank(field) || (elemSource.length === 0)) continue;

        const current = getFieldValue(elemSource);

        if(current.type === 'multi-select') continue;

        // Picklists need { link, title } to show the title and keep the link (see
        // insertFieldPicklistControls); rows loaded from the BOM view only carry the title
        const isPicklist = (current.type === 'single-select');
        const value      = !isPicklist ? (current.value || '') : (isBlank(current.display) ? '' : { link : current.value || current.display, title : current.display });

        const elemField = $('<div></div>').appendTo(elemFields).addClass('field');

        $('<div></div>').appendTo(elemField).addClass('field-label').text(field.def.name);

        const elemValue = $('<div></div>').appendTo(elemField)
            .addClass('field-value')
            .attr('data-initial', isPicklist ? (current.display || '') : (current.value || ''));

        insertField({ editable : true }, elemValue, Object.assign({}, field.def, { hasValue : true, setValue : value }), null, config.wsMain.picklists, false, false);

    }

    return elemFields;

}
function getChapterViewEditFieldChanges(elemFields) {

    let changes = [];

    elemFields.children('.field').each(function() {

        const elemValue  = $(this).children('.field-value');
        const result     = getFieldValue(elemValue);
        const isPicklist = (result.type === 'single-select');
        const display    = isPicklist ? (elemValue.find('.picklist-input').first().val() || '') : (result.value || '');

        if(display === elemValue.attr('data-initial')) return;

        // Search text typed into a picklist without choosing an option is no valid value
        if(isPicklist && (display !== '') && isBlank(result.value)) return;

        changes.push({ fieldId : result.fieldId, isPicklist : isPicklist, link : isPicklist ? (result.value || '') : '', display : display });

    });

    return changes;

}

// Writes title, description and changed further fields into all editor rows of the requirement
// (several if reused) and marks them changed, the same as typing in the Content Editor would;
// Navigator and pins are updated through the core's own helpers.
function applyChapterViewEdit(row, title, description, changes) {

    getChapterViewEditorRows(row).each(function() {

        const elemEditor = $(this);
        const elemTitle  = elemEditor.find('.editor-item-title').first();

        elemTitle.val(title).removeClass('missing');
        elemEditor.find('.editor-item-description .rte-input').first().html(description);

        for(let change of changes) {

            const elemTarget = elemEditor.find('.editor-item-advanced .field-id-' + change.fieldId + '.field-editable').first();

            if(change.isPicklist) {
                const elemInput = elemTarget.find('.picklist-input').first().val(change.display);
                if(isBlank(change.link)) elemInput.removeAttr('data-value'); else elemInput.attr('data-value', change.link);
            } else {
                elemTarget.find('input, textarea').first().val(change.display);
            }

            elemTarget.addClass('changed');

        }

        setChanged(elemEditor);
        updateTreeItemTitle(elemTitle);
        updatePin(elemTitle);

    });

    row.details.TITLE       = title;
    row.details.DESCRIPTION = description;
    row.edited              = true;

    for(let change of changes) row.details[change.fieldId] = change.display;

    closeChapterViewEdit();

}

// "+ New Requirement" below each chapter opens a small form; Title is required, REQ CATEGORY uses
// the same choices as a new row in the Content Editor (newChildCategoryChoices).
function insertChapterViewCreate(elemChapter, register, chapter) {

    const labels     = getChapterViewConfig().labels;
    const choices    = config.wsMain.newChildCategoryChoices || [];
    const elemCreate = $('<div></div>').appendTo(elemChapter).addClass('chapter-view-create');

    const elemOpen = $('<div></div>').appendTo(elemCreate)
        .addClass('chapter-view-create-open')
        .text(labels.newRequirement);

    const elemForm = $('<div></div>').appendTo(elemCreate)
        .addClass('chapter-view-create-form')
        .addClass('hidden');

    const elemTitle = $('<input></input>').appendTo(elemForm)
        .addClass('chapter-view-create-title')
        .attr('placeholder', labels.title);

    const elemDescription = $('<input></input>').appendTo(elemForm)
        .addClass('chapter-view-create-description')
        .attr('placeholder', labels.description);

    // Styled like the inputs; the framework's .button height clips the text of a select here
    const elemCategory = $('<select></select>').appendTo(elemForm)
        .addClass('chapter-view-create-category')
        .toggleClass('hidden', choices.length === 0);

    for(let choice of choices) elemCategory.append($('<option></option>').attr('value', choice.link).text(choice.label));

    // Own class instead of the editor's .missing: saveChanges() (apps/editor.js) aborts the save as
    // long as any element with .missing exists on the page, this form included
    const submit = function() {
        if(elemTitle.val().trim() === '') { elemTitle.addClass('chapter-view-input-missing').focus(); return; }
        createChapterViewRequirement(register, chapter.key, elemTitle.val().trim(), elemDescription.val().trim(), elemCategory.val());
    };

    $('<div></div>').appendTo(elemForm).addClass('button').addClass('default').text(labels.create).click(submit);
    $('<div></div>').appendTo(elemForm).addClass('button').text(labels.cancel).click(function() {
        elemForm.addClass('hidden');
        elemOpen.removeClass('hidden');
    });

    elemForm.find('input').on('keydown', function(e) {
        if(e.key === 'Enter') submit();
        if(e.key === 'Escape') { elemForm.addClass('hidden'); elemOpen.removeClass('hidden'); }
    });

    elemOpen.click(function() {
        elemOpen.addClass('hidden');
        elemForm.removeClass('hidden');
        elemTitle.focus();
    });

}

// Appends a new row at the end of the Content Editor on level 1 - saved as direct child of the
// root, where the hierarchy check does not apply. REQ Level (from the register) and chapter are
// passed as row data and their Advanced Fields marked changed, so createNewItems() sends them
// like a manual entry. The picklist value needs the option's link, looked up by its title in the
// picklists the editor already loaded for its Advanced Fields.
function createChapterViewRequirement(register, chapterKey, title, description, categoryLink) {

    const chapterConfig = getChapterViewConfig();
    const labels        = chapterConfig.labels;
    const chapter       = register.chapters.get(chapterKey);
    const levelOption   = getChapterViewPicklistOption(chapterConfig.fieldIdRegister, register.key);

    if(isBlank(chapter)) return;

    if(levelOption === null) {
        showErrorMessage(labels.toggle, labels.levelNotFound.replace('{value}', register.key));
        return;
    }

    let data = {
        TITLE       : title,
        DESCRIPTION : $('<div></div>').text(description).html()   // Plain text, escaped for the rich text field
    };

    data[chapterConfig.fieldIdRegister] = levelOption;
    data[chapterConfig.fieldIdChapter ] = chapter.label;

    const elemLast   = $('#editor-content').children('.editor-item').last();
    const elemEditor = insertContentEditorElement((elemLast.length > 0) ? elemLast : null, null, '', 'WIP', null, null, 1, data);

    setNumbersAndLevels();

    for(let fieldId of [ chapterConfig.fieldIdRegister, chapterConfig.fieldIdChapter ]) {
        elemEditor.find('.editor-item-advanced .field-id-' + fieldId + '.field-editable').addClass('changed');
    }

    // Rows with data get no REQ CATEGORY choice from the insertContentEditorElement wrap, so it
    // is added here with the value chosen in the form, still changeable in the Content Editor
    if(!isBlank(categoryLink)) setRequirementCategoryOption(elemEditor, categoryLink);

    let details = {};

    for(let column of chapterConfig.columns) details[column.fieldId] = null;

    details.TITLE                          = title;
    details.DESCRIPTION                    = description;
    details[chapterConfig.fieldIdRegister] = register.key;
    details[chapterConfig.fieldIdChapter ] = chapter.label;

    // originalKey null: a new requirement stays pending until saved, wherever it is moved to
    const row = {
        uid           : 'new-' + elemEditor.attr('data-id'),
        link          : '',
        details       : details,
        id            : '',
        editorId      : elemEditor.attr('data-id'),
        chapterKey    : chapterKey,
        chapterLabel  : chapter.label,
        originalKey   : null,
        originalLabel : ''
    };

    chapter.rows.push(row);
    chapterViewData.rows.set(row.uid, row);
    register.count++;

    renderChapterView();

}

// Drops rows whose requirement is gone from the Content Editor: one created here and deleted again
// before saving (it has no link to restore), or a saved one whose rows removeBOMItems took out of
// the editor once a save removed its BOM links. A saved one only marked deleted stays (undo).
function removeChapterViewDeletedRows() {

    for(let register of chapterViewData.registers) {
        for(let chapter of register.chapters.values()) {
            chapter.rows = chapter.rows.filter(function(row) {
                const exists = isBlank(row.link) ? (getChapterViewEditorRows(row).length > 0) : (getChapterViewEditorRowsAll(row).length > 0);
                if(exists) return true;
                chapterViewData.rows.delete(row.uid);
                register.count--;
                return false;
            });
        }
    }

}

function getChapterViewPicklistOption(fieldId, title) {

    const field = (config.wsMain.advancedFields || []).find(function(field) { return field.fieldId === fieldId; });

    if(isBlank(field) || isBlank(field.def.picklist)) return null;

    const picklist = (config.wsMain.picklists || []).find(function(picklist) { return !isBlank(picklist) && (picklist.link === field.def.picklist); });

    if(isBlank(picklist) || !Array.isArray(picklist.items)) return null;

    const option = picklist.items.find(function(item) { return getChapterViewKey(String(item.title)) === getChapterViewKey(title); });

    return isBlank(option) ? null : { link : option.link, title : option.title };

}

// Called from the storeNewItemLinks wrap above once the ID of a newly created item is known
function updateChapterViewRowId(elemEditor, requirementId) {

    if(chapterViewData === null) return;

    const row = chapterViewData.rows.get('new-' + elemEditor.attr('data-id'));

    if(isBlank(row)) return;

    row.id         = requirementId;
    row.details.ID = requirementId;

    if($('body').hasClass('chapter-view')) renderChapterView();

}

// Plain click selects only this row, Ctrl + click adds or removes it, Shift + click selects all
// rows between the last selected one and this one, in the order shown in the current tab.
// Locked rows can be selected too (e.g. to open them in the editor), moves skip them anyway.
function selectChapterViewRow(elemRow, isToggle, isRange) {

    const uid      = elemRow.attr('data-uid');
    const elemRows = elemRow.closest('.chapter-view-tab').find('.chapter-view-row');

    if(isRange && (chapterViewLastClick !== null)) {
        const uids = elemRows.toArray().map(function(elem) { return $(elem).attr('data-uid'); });
        const from = uids.indexOf(chapterViewLastClick);
        const to   = uids.indexOf(uid);
        if((from >= 0) && (to >= 0)) {
            uids.slice(Math.min(from, to), Math.max(from, to) + 1).forEach(function(value) { chapterViewSelection.add(value); });
        }
    } else if(isToggle) {
        if(chapterViewSelection.has(uid)) chapterViewSelection.delete(uid); else chapterViewSelection.add(uid);
        chapterViewLastClick = uid;
    } else {
        chapterViewSelection.clear();
        chapterViewSelection.add(uid);
        chapterViewLastClick = uid;
    }

    $('#chapter-view-content').find('.chapter-view-row').each(function() {
        $(this).toggleClass('selected', chapterViewSelection.has($(this).attr('data-uid')));
    });

    updateChapterViewActions();

}
function clearChapterViewSelection() {

    chapterViewSelection.clear();
    chapterViewLastClick = null;
    $('#chapter-view-content').find('.chapter-view-row.selected').removeClass('selected');

    updateChapterViewActions();

}
function getChapterViewSelectedRow() {

    if((chapterViewData === null) || (chapterViewSelection.size !== 1)) return null;

    return chapterViewData.rows.get(Array.from(chapterViewSelection)[0]) || null;

}
function updateChapterViewActions() {

    const row = getChapterViewSelectedRow();

    $('#chapter-view-edit').toggleClass('disabled', (row === null) || !isChapterViewRowEditable(row));
    $('#chapter-view-open').toggleClass('disabled', (row === null) || (row.editorId === ''));

    const canDelete = (chapterViewData !== null) && Array.from(chapterViewSelection).some(function(uid) {
        const selected = chapterViewData.rows.get(uid);
        return !isBlank(selected) && !isChapterViewRowDeleted(selected) && isChapterViewRowDeletable(selected);
    });

    $('#chapter-view-delete').toggleClass('disabled', !canDelete);

}

// Native drag & drop. Dragging a selected row moves the whole selection, an unselected row moves
// alone. Drops are only accepted within the same register, as the register follows REQ Level.
function insertChapterViewDragSource(elemRow, register, row) {

    elemRow.attr('draggable', 'true')
        .on('dragstart', function(e) {
            if(!chapterViewSelection.has(row.uid)) {
                clearChapterViewSelection();
                chapterViewSelection.add(row.uid);
            }
            chapterViewDrag = { register : register, uids : Array.from(chapterViewSelection) };
            e.originalEvent.dataTransfer.effectAllowed = 'move';
            e.originalEvent.dataTransfer.setData('text/plain', row.id || row.uid); // Required by Firefox to start dragging
            $('#chapter-view').addClass('chapter-view-dragging');
        })
        .on('dragend', function() {
            chapterViewDrag = null;
            $('#chapter-view').removeClass('chapter-view-dragging');
            $('.chapter-view-drop-target').removeClass('chapter-view-drop-target');
        });

}
function insertChapterViewDropTarget(elemChapter, register, chapterKey) {

    elemChapter
        .on('dragover', function(e) {
            if((chapterViewDrag === null) || (chapterViewDrag.register !== register)) return;
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = 'move';
            elemChapter.addClass('chapter-view-drop-target');
        })
        .on('dragleave', function(e) {
            // dragleave also fires when moving over child elements of the chapter
            if(!elemChapter.get(0).contains(e.originalEvent.relatedTarget)) elemChapter.removeClass('chapter-view-drop-target');
        })
        .on('drop', function(e) {
            if((chapterViewDrag === null) || (chapterViewDrag.register !== register)) return;
            e.preventDefault();
            moveChapterViewRows(register, chapterViewDrag.uids, chapterKey);
        });

}

// Inline rename in the chapter heading: Enter applies, Escape or leaving the field cancels (no
// apply on blur, as applying may ask for confirmation)
function startChapterViewRename(elemHeader, register, chapter) {

    const elemTitle = elemHeader.children('.chapter-view-chapter-title').addClass('hidden');
    let   isDone    = false;

    elemHeader.children('.chapter-view-chapter-rename').addClass('hidden');

    const elemInput = $('<input></input>').insertAfter(elemTitle)
        .addClass('chapter-view-chapter-rename-input')
        .val(chapter.label)
        .on('click dblclick', function(e) { e.stopPropagation(); });

    const finish = function(apply) {
        if(isDone) return;
        isDone = true;
        if(apply) renameChapterViewChapter(register, chapter.key, elemInput.val()); else renderChapterView();
    };

    elemInput
        .on('keydown', function(e) {
            if(e.key === 'Enter') { e.preventDefault(); finish(true); }
            if(e.key === 'Escape') finish(false);
        })
        .on('blur', function() { finish(false); })
        .focus()
        .select();

}

// A chapter only exists through the requirements carrying it, so renaming sets CHAPTER on all of
// them. Locked requirements cannot be changed and keep the old name, after confirmation (the
// chapter then splits until they are revised). A name that already exists in this register merges
// both, also after confirmation; a new name takes the old chapter's place in the order.
function renameChapterViewChapter(register, chapterKey, newLabel) {

    const labels  = getChapterViewConfig().labels;
    const chapter = register.chapters.get(chapterKey);
    const label   = newLabel.trim();
    const newKey  = getChapterViewKey(label);

    if(isBlank(chapter) || (label === '') || (label === chapter.label)) { renderChapterView(); return; }

    const movable     = chapter.rows.filter(isChapterViewRowMovable);
    const countLocked = chapter.rows.length - movable.length;

    if((countLocked > 0) && !confirm(labels.confirmRenameLocked.replace('{count}', countLocked).replace('{total}', chapter.rows.length).replace('{title}', chapter.label))) {
        renderChapterView();
        return;
    }

    // Same chapter in another spelling: relabel in place
    if(newKey === chapterKey) {
        chapter.label = label;
        for(let row of movable) {
            row.chapterLabel = label;
            setChapterViewEditorValue(row, label);
        }
        renderChapterView();
        return;
    }

    if(register.chapters.has(newKey)) {
        if(!confirm(labels.confirmMerge.replace('{title}', register.chapters.get(newKey).label))) { renderChapterView(); return; }
    } else {
        const entries = Array.from(register.chapters.entries());
        register.chapters.clear();
        for(let entry of entries) {
            if(entry[0] === chapterKey) register.chapters.set(newKey, { key : newKey, label : label, rows : [] });
            register.chapters.set(entry[0], entry[1]);
        }
    }

    if(chapterViewCollapsed.has(register.key + '|' + chapterKey)) chapterViewCollapsed.add(register.key + '|' + newKey);

    moveChapterViewRows(register, movable.map(function(row) { return row.uid; }), newKey);

    if(chapter.rows.length === 0) register.chapters.delete(chapterKey);

    renderChapterView();

}

function moveChapterViewRows(register, uids, targetKey) {

    const target = register.chapters.get(targetKey);

    if(isBlank(target)) return;

    for(let uid of uids) {

        const row = chapterViewData.rows.get(uid);

        if(isBlank(row) || (row.chapterKey === targetKey) || !isChapterViewRowMovable(row)) continue;

        const source = register.chapters.get(row.chapterKey);

        // Rows of other registers cannot be part of a selection, but guard against it anyway
        if(isBlank(source) || !source.rows.includes(row)) continue;

        source.rows.splice(source.rows.indexOf(row), 1);
        target.rows.push(row);
        row.chapterKey = targetKey;

        // Moved back to where it was saved: the original spelling is restored, not the target's
        row.chapterLabel = (targetKey === row.originalKey) ? row.originalLabel : target.label;

        setChapterViewEditorValue(row, row.chapterLabel);

    }

    clearChapterViewSelection();
    renderChapterView();

}

// Writes the chapter into the CHAPTER Advanced Field of all editor rows of the requirement and
// marks field and row as changed, exactly what a manual edit in Advanced Mode would do. A move
// back to the saved chapter only unmarks the field; the row itself may carry other changes.
function setChapterViewEditorValue(row, value) {

    const fieldClass = '.field-id-' + getChapterViewConfig().fieldIdChapter + '.field-editable';
    const isPending  = isChapterViewChapterPending(row);

    getChapterViewEditorRows(row).each(function() {

        const elemEditor = $(this);
        const elemField  = elemEditor.find('.editor-item-advanced ' + fieldClass).first();

        elemField.find('input').val(value);
        elemField.toggleClass('changed', isPending);

        if(isPending) setChanged(elemEditor);

    });

}

// DESCRIPTION is rich text; DOMParser yields its plain text without running scripts or loading
// images contained in it, unlike jQuery's .html() on a detached element.
function getChapterViewText(value) {

    if(value.indexOf('<') < 0) return value;

    const doc = new DOMParser().parseFromString(value, 'text/html');

    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();

}

// The last tab is remembered per structure; storage may be unavailable (private mode, policy)
function getChapterViewStorageKey() {

    return 'editor-chapter-view-tab:' + ((chapterViewData === null) ? '' : chapterViewData.root);

}
function storeChapterViewTab(registerKey) {

    try { localStorage.setItem(getChapterViewStorageKey(), registerKey); } catch(e) {}

}
function getStoredChapterViewTab() {

    try { return localStorage.getItem(getChapterViewStorageKey()); } catch(e) { return null; }

}

function isChapterViewAvailable() {

    return (chapterViewData !== null) && (editMode !== 'template') && $('#main').is(':visible');

}
function toggleChapterView() {

    if($('body').hasClass('chapter-view')) {
        closeChapterView();
        return;
    }

    if(!isChapterViewAvailable()) return;

    // Dashboard and chapter view both take the place of the Content Editor, only one at a time
    if($('body').hasClass('dashboard-mode')) toggleDashboard();

    $('body').addClass('chapter-view');
    $('#button-toggle-chapter-view').removeClass('toggle-off').addClass('toggle-on');

    // Locks may have changed in the Content Editor meanwhile (e.g. an item reused since)
    renderChapterView();

}
function closeChapterView() {

    $('body').removeClass('chapter-view');
    $('#button-toggle-chapter-view').removeClass('toggle-on').addClass('toggle-off');

}

const baseChapterToggleDashboard = toggleDashboard;

toggleDashboard = function() {

    if($('body').hasClass('chapter-view')) closeChapterView();

    baseChapterToggleDashboard();

};

// The save run ends here (see the dashboard wrap above), whether started from the Content Editor
// or from this view: moved, edited and created rows count as saved from now on. A failed edit of a single item is
// reported by editExistingItems itself; the view cannot tell which one, so it trusts the save.
const baseChapterUpdateAfterTemplateProcessing = updateAfterTemplateProcessing;

updateAfterTemplateProcessing = function() {

    baseChapterUpdateAfterTemplateProcessing();

    if(chapterViewData === null) return;

    const fieldId = getChapterViewConfig().fieldIdChapter;

    for(let register of chapterViewData.registers) {
        for(let chapter of register.chapters.values()) {
            for(let row of chapter.rows) {
                if(!isChapterViewRowPending(row)) continue;
                // A new requirement counts as saved once createNewItems stored its link
                if(isBlank(row.link)) {
                    const link = getChapterViewEditorRows(row).attr('data-link');
                    if(isBlank(link)) continue;
                    row.link = link;
                }
                row.originalKey      = row.chapterKey;
                row.originalLabel    = row.chapterLabel;
                row.details[fieldId] = row.chapterLabel;   // Same object as in bomPartsList
                row.edited           = false;
            }
        }
    }

    renderChapterView();

};

// Jump to the requirement's row in the Content Editor, using the same helpers as a click on a
// Navigator row (selectBOMItem) or an editor row, and briefly highlight it.
function jumpFromChapterView(editorId) {

    const elemEditor = $('#editor-content').children('.editor-item.id-' + editorId).first();

    if(elemEditor.length === 0) {
        showErrorMessage(getChapterViewConfig().labels.toggle, getChapterViewConfig().labels.notFound);
        return;
    }

    closeChapterView();

    if($('.editor-item.max').length > 0) {
        $('.editor-item').removeClass('max').addClass('min');
        elemEditor.addClass('max').removeClass('min');
    } else scrollToElement(elemEditor);

    selectMatchingTreeItem(elemEditor);
    setSidePanel(elemEditor.attr('data-link'));

    elemEditor.addClass('chapter-view-highlight');

    setTimeout(function() { elemEditor.removeClass('chapter-view-highlight'); }, 2000);

}

// Specification Sync: RELATED SPECIFICATION (PARENT_SPECIFICATION) and further fields taken over
// from the specification are set by an existing on-demand action in Fusion Manage, run on the
// specification (config.specificationSync.scriptName). It was only started by hand in Fusion, so
// requirements created in the editor stayed without them. The editor runs that action instead of
// duplicating its logic (project vs. catalog, primary vs. reused use): with the combined "Sync"
// button, and on its own after a save that created or newly linked requirements. Not after every
// save, since the action rewrites the multi-value fields of every project requirement on each run.
let specificationSyncPending = false;

function getSpecificationSyncConfig() {

    return (!isBlank(config.specificationSync) && config.specificationSync.enabled) ? config.specificationSync : null;

}

// Rows without link are created, rows without edge id get linked by this save. Template mode is
// left out: links.root still points at the template there until the save has finished.
const baseSyncSaveChanges = saveChanges;

saveChanges = function() {

    const syncConfig = getSpecificationSyncConfig();

    if((syncConfig !== null) && syncConfig.afterSave && (editMode === 'existing')) {
        const hasNewRows = $('#editor-content').children('.editor-item').not('.deleted').toArray().some(function(elem) {
            return isBlank($(elem).attr('data-link')) || isBlank($(elem).attr('data-edgeid'));
        });
        if(hasNewRows) specificationSyncPending = true;
    }

    baseSyncSaveChanges();

};

// End of a complete save run (see the dashboard wrap above). A save aborted by the REQ Level check
// or an error keeps the flag, so the next successful save runs the action.
const baseSyncUpdateAfterTemplateProcessing = updateAfterTemplateProcessing;

updateAfterTemplateProcessing = function() {

    baseSyncUpdateAfterTemplateProcessing();

    if(specificationSyncPending) {
        specificationSyncPending = false;
        runSync(true);
    }

};

// Combined "Sync" button (inserted next to the reused sync above): first the specification sync,
// then the REUSED reconciliation, reported together in one message. After a save only the
// specification sync runs (onlySpecification). The button stays disabled while either runs.
function getSyncLabels() {

    const labels = (getSpecificationSyncConfig() || {}).labels || {};

    return {
        button  : labels.button  || 'Sync',
        running : labels.running || 'Syncing ...',
        title   : labels.title   || 'Sync',
        tooltip : labels.tooltip || ''
    };

}
function runSync(onlySpecification) {

    const labels     = getSyncLabels();
    const elemButton = $('#button-sync');

    if(elemButton.hasClass('disabled')) return;
    if(isBlank(links.root) || (editMode !== 'existing')) return;

    elemButton.addClass('disabled').text(labels.running);

    let messages = [];
    let hasError = false;

    const finish = function() {
        elemButton.removeClass('disabled').text(labels.button);
        if(messages.length === 0) return;
        if(hasError) showErrorMessage(labels.title, messages.join('<br>')); else showSuccessMessage(labels.title, messages.join('<br>'));
    };

    runSpecificationSync(function(isError, message) {

        if(!isBlank(message)) messages.push(message);
        hasError = hasError || isError;

        if(onlySpecification) { finish(); return; }

        syncReusedStatus(function(message) {
            messages.push(message);
            finish();
        });

    });

}

function runSpecificationSync(callback) {

    const syncConfig = getSpecificationSyncConfig();

    if(syncConfig === null) { callback(false, ''); return; }

    const labels = syncConfig.labels;
    const finish = function(isError, message) { callback(isError, 'Specification: ' + message); };

    Promise.all([
        $.get('/plm/workspace-scripts', { wsId : config.wsMain.workspaceId, useCache : true }),
        $.get('/plm/details', { link : links.root })
    ]).then(function(responses) {

        const name    = syncConfig.scriptName.trim().toLowerCase();
        const scripts = (responses[0].error || isBlank(responses[0].data)) ? [] : (responses[0].data.scripts || []);
        const script  = scripts.find(function(script) {
            return (script.scriptBehaviorType === 'ON_DEMAND') && [ script.uniqueName, script.displayName ].some(function(value) {
                return !isBlank(value) && (value.trim().toLowerCase() === name);
            });
        });

        if(isBlank(script)) { finish(true, labels.notFound.replace('{name}', syncConfig.scriptName)); return; }
        if(responses[1].error) { finish(true, responses[1].message); return; }

        // The open structure may be a sub structure (e.g. a REQP opened on its own); the action
        // only runs on a specification, so its RELATED SPECIFICATION is used then
        const sections = responses[1].data.sections;
        const category = getSectionFieldValue(sections, 'REQUIREMENT_TYPE', '', 'title');
        const specLink = (category === 'Specification') ? links.root : getSectionFieldValue(sections, 'PARENT_SPECIFICATION', '', 'link');

        if(isBlank(specLink)) { finish(true, labels.noSpec); return; }

        $.post('/plm/run-item-script', { link : specLink, scriptId : script.__self__.split('/').pop(), getDetails : 'true' }, function(response) {

            if(response.error) { finish(true, response.message); return; }

            // The action reports its outcome in the result field; aborts and errors are only
            // recognizable by its wording ("Abbruch", "Fehler")
            const result = String(getSectionFieldValue(response.data.sections, syncConfig.resultFieldId, '') || '');

            finish(/abbruch|fehler/i.test(result), result || syncConfig.scriptName);

        });

    });

}
