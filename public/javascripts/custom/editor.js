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

// TEMPORARY: global drag/drop event tracer to diagnose Add From Library drag-and-drop
document.addEventListener('dragstart', function(e) { console.log('[DND] dragstart on', e.target); }, true);
document.addEventListener('dragenter', function(e) { console.log('[DND] dragenter on', e.target); }, true);
document.addEventListener('dragover',  function(e) { console.log('[DND] dragover on' , e.target); }, true);
document.addEventListener('drop',      function(e) { console.log('[DND] drop on'     , e.target); }, true);
document.addEventListener('dragend',   function(e) { console.log('[DND] dragend on'  , e.target); }, true);
