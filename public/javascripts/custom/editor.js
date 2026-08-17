// Shows the Requirement ID next to the hierarchy number on each row of the Content Editor.
// insertContentEditorElement (apps/editor.js) does not render an ID field by default, so it is
// wrapped here rather than modifying the core app file.
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
