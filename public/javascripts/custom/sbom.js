// public/javascripts/custom/sbom.js
// *** Anpassung Hawa ohne List-Position
function createListParents(callback) {

    // Für bomTypes mit mode 'list' wird KEIN eigener Parent-Artikel mehr erzeugt.
    // Die Liste hängt direkt am TargetBOM.
    for (let bomType of bomTypes) {

        if (bomType.mode === 'list') {

            // Immer auf das Haupt-Item mappen, egal was vorher (Source-BOM) gesetzt hat
            bomType.linkRoot = links.targetBOM;

            // UI-Element bekommt den Link auf das Haupt-Item
            if (bomType.elemContent) {
                bomType.elemContent.attr('data-link', bomType.linkRoot);
            }
        }
    }

    // Direktes Callback, da keine Async-Calls mehr
    if (typeof callback === 'function') {
        callback();
    }
} // *** Anpassung Hawa ohne List-Position
