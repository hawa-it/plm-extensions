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
        .insertBefore('#button-sync-reused')
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
let dashboardData = { link : '', parts : [], stale : true, loading : false, timestamp : null };

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

            renderDashboard();

        });

    });

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
    const missingFields = (dashboardData.parts.length === 0) ? [] : Object.values(fieldIds).concat(testFieldIds).filter(function(fieldId) {
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

}

// Colors for the result values written by "REQ - Requirement Validations WF Actions.js";
// any other value gets the neutral bar color.
function getValidationColor(value) {

    const style = getComputedStyle(document.body);
    const names = { 'Success' : '--color-status-green', 'Conditional Success' : '--color-status-yellow', 'Failed' : '--color-status-red', '' : '--color-surface-level-4' };

    return style.getPropertyValue(names[value] || '--color-blue-500').trim();

}

// Validation progress per chapter (first level of the structure), one stacked bar each. The
// process description names this gap explicitly: there is no overview for project managers
// (5.8) and results do not cascade up the structure automatically (5.9).
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

    const labels = chapters.map(function(chapter) {
        const details = chapter.part.details;
        return [ details.ID, details.TITLE ].filter(function(value) { return !isBlank(value); }).join(' ') || chapter.part.title;
    });

    insertDashboardStackedChart(elemParent, 'dashboard-chart-chapters', 'Validation Progress per Chapter', labels,
        validationGroups.map(function(group, indexGroup) {
            return {
                label : group.label,
                color : getValidationColor(group.value),
                data  : chapters.map(function(chapter) { return chapter.counts[indexGroup]; })
            };
        }),
        function(indexLabel, indexGroup) {
            const chapter = chapters[indexLabel];
            const group   = validationGroups[indexGroup];
            applyDashboardFilter(labels[indexLabel] + ': ' + group.label, function(part) {
                const value = part.details[fieldId];
                return (chapterOf.get(part) === chapter) && inScope.has(part) && ((group.value === '') ? isBlank(value) : (value === group.value));
            });
        }
    );

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
function insertDashboardStackedChart(elemParent, id, title, labels, datasets, onClickSegment) {

    const elemCanvas = insertDashboardChartBox(elemParent, id, title, 70 + (labels.length * 36));

    loadChartLibrary(function() {

        if(!isBlank(dashboardCharts[id])) dashboardCharts[id].destroy();

        const style     = getComputedStyle(document.body);
        const colorFont = style.getPropertyValue('--color-font').trim();
        const colorGrid = style.getPropertyValue('--color-surface-level-4').trim();

        dashboardCharts[id] = new Chart(elemCanvas.get(0), {
            type : 'bar',
            data : {
                labels   : labels,
                datasets : datasets.map(function(dataset) {
                    return { label : dataset.label, data : dataset.data, backgroundColor : dataset.color };
                })
            },
            options : {
                indexAxis           : 'y',
                maintainAspectRatio : false,
                animation           : false,
                plugins             : { legend : { position : 'bottom', labels : { color : colorFont } } },
                onHover             : function(e, elements) {
                    e.native.target.style.cursor = (elements.length > 0) ? 'pointer' : 'default';
                },
                onClick             : function(e, elements) {
                    if(elements.length === 0) return;
                    onClickSegment(elements[0].index, elements[0].datasetIndex);
                },
                scales              : {
                    x : { stacked : true, beginAtZero : true, ticks : { precision : 0, color : colorFont }, grid : { color : colorGrid } },
                    y : { stacked : true, ticks : { color : colorFont }, grid : { display : false } }
                }
            }
        });

    });

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
                    applyDashboardFilter(fieldLabel + ': ' + group.label, function(part) {
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

