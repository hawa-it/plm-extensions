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

    return elemTop;

};

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
const baseAfterBOMCompletion = afterBOMCompletion;

afterBOMCompletion = function(id, data) {

    baseAfterBOMCompletion(id, data);

    markReusedItemsInNavigator();

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

    if(!isBlank(requirementId)) {
        elemTreeItem.find('.tree-column-title').prepend(requirementId + ' - ');
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

