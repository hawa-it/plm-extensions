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
