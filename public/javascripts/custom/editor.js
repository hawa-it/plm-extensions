// Shows the Requirement Number next to the hierarchy number on each row of the Content Editor.
// insertContentEditorElement (apps/editor.js) does not render a number field by default, so it is
// wrapped here rather than modifying the core app file. The value itself (bomPart.partNumber) is
// surfaced into data.NUMBER by apps/editor.js's afterBOMCompletion() before this runs.
const baseInsertContentEditorElement = insertContentEditorElement;

insertContentEditorElement = function(elemPrevious, link, number, revision, parent, edge, level, data) {

    const elemTop = baseInsertContentEditorElement(elemPrevious, link, number, revision, parent, edge, level, data);

    const requirementNumber = data && data.NUMBER;

    if(!isBlank(requirementNumber)) {
        $('<div></div>')
            .addClass('editor-item-id')
            .html(requirementNumber)
            .insertAfter(elemTop.find('.editor-item-number'));
    }

    return elemTop;

};
