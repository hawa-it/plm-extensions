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

function setRequirementCategoryOption(elemTop) {

    if(isBlank(config.wsMain.newChildCategoryChoices)) return;

    const elemSelect = $('<select></select>')
        .addClass('editor-template-action')
        .addClass('action-reuse')
        .attr('title', 'REQ CATEGORY for this new requirement')
        .appendTo(elemTop.find('.editor-item-header'));

    for(let choice of config.wsMain.newChildCategoryChoices) {
        elemSelect.append($('<option></option>').attr('value', choice.link).html(choice.label));
    }

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

// "Sync Reused" button: REUSED is only ever set going forward by this app's own drag-and-drop
// reuse flow (see onEditorDrop / editExistingItems), so it won't reflect items that ended up
// linked in multiple places some other way. This lets the user manually reconcile REUSED
// against Fusion Manage's actual where-used count for every item in the open structure -
// deliberately not done automatically on every load, since that would mean one extra request
// per item (this structure alone has dozens).
$(document).ready(function() {

    $('<div></div>')
        .attr('id', 'button-sync-reused')
        .addClass('button')
        .html('Sync Reused')
        .insertBefore('#header-avatar')
        .click(function() {
            syncReusedStatus();
        });

});

function syncReusedStatus() {

    const elemButton = $('#button-sync-reused');

    if(elemButton.hasClass('disabled')) return;

    const items     = bomPartsList.slice(1).filter(function(bomPart) { return !isBlank(bomPart.link); });
    const batchSize = 5;

    let index        = 0;
    let countUpdated = 0;

    if(items.length === 0) { showSuccessMessage('Sync Reused', 'No items to check.'); return; }

    elemButton.addClass('disabled').html('Syncing...');

    function processBatch() {

        if(index >= items.length) {

            markReusedItemsInNavigator();
            elemButton.removeClass('disabled').html('Sync Reused');
            showSuccessMessage('Sync Reused', countUpdated + ' of ' + items.length + ' item(s) updated.');
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

    $('<span></span>')
        .addClass('tree-column-title-id')
        .html(isBlank(requirementId) ? '' : (requirementId + ' - '))
        .prependTo(elemTreeItem.find('.tree-column-title'));

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

        } else {

            elemTop.attr('data-link', elemTop.attr('data-original-link'));
            elemTop.toggleClass('pending-reuse', wasPendingReuse);
            setEditorItemReused(elemTop);
            elemIdBox.html(originalId);
            elemTreeId.html(originalTreeId);

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

