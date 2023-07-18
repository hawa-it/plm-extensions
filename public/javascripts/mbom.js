let maxRequests        = 3;
let wsEBOM             = { 'id' : '', 'sections' : [], 'fields' : [], 'viewId' : '', 'viewColumns' : [] };
let wsMBOM             = { 'id' : '', 'sections' : [], 'fields' : [], 'viewId' : '', 'viewColumns' : [] };
let singleWorkspace    = false;

let eBOM         = {};
let mBOM         = {};
let instructions = [];

let basePartNumber      = '';
let viewerStarted       = false;
let viewerStatusColors  = false;
let disassembleMode     = false;
let elemBOMDropped      = null;
let siteSuffix          = '';
let siteLabel           = '';

let pendingActions, pendingRemovals;
let linkEBOM, linkMBOM, linkFieldEBOMItem, linkFieldEBOMRootItem;
let sectionIdMBOM;


$(document).ready(function() {

    for(option of options) {
        let param = option.split(':');
        if(param[0].toLowerCase() === 'site') {
            siteSuffix = '_' + param[1];
            siteLabel = param[1];
        }
    }

    wsEBOM.wsId = config.mbom.wsIdEBOM;
    wsMBOM.wsId = config.mbom.wsIdMBOM;

    appendProcessing('ebom', false);
    appendProcessing('mbom', false);
    appendProcessing('details');
    appendOverlay();

    insertSearchFilters();
    setUIEvents();
    getInitialData();   
        
});


function setUIEvents() {


    // Header Toolbar
    $('#header-logo').click(function () { reloadPage(); });
    $('#header-title').click(function () { reloadPage(); });
    $('#toggle-details').click(function() { 
        $('body').toggleClass('details-on');
        setTimeout(function() { viewer.resize(); }, 250); 
    })
    $('#reset').click(function() { reloadPage(); });  
    $('#save').click(function() {
        setSaveActions();
        showSaveProcessingDialog();
        createNewItems();
    });


    // Tabs
    $('#mode-disassemble').click(function() { 
        $('body').addClass('mode-disassemble').removeClass('mode-ebom').removeClass('mode-add').removeClass('mode-instructions');
        setTimeout(function() { 
            viewer.resize(); 
            viewer.setGhosting(false);
            restoreAssembly();
        }, 250); 
        disassembleMode = true;
    });
    $('#mode-ebom').click(function() { 
        $('body').removeClass('mode-disassemble').addClass('mode-ebom').removeClass('mode-add').removeClass('mode-instructions');
        if(typeof viewer !== 'undefined') {
            setTimeout(function() { 
                viewer.resize(); 
                viewer.setGhosting(true);
                viewerResetSelection(false);
            }, 250); 
        }
        disassembleMode = false;
    });
    $('#mode-add').click(function() { 
        $('body').removeClass('mode-disassemble').removeClass('mode-ebom').addClass('mode-add').removeClass('mode-instructions');
        setTimeout(function() { viewer.resize(); }, 250); 
        disassembleMode = false;
    });
    $('#mode-instructions').click(function() { 
        $('body').removeClass('mode-disassemble').removeClass('mode-ebom').removeClass('mode-add').addClass('mode-instructions');
        setTimeout(function() { viewer.resize(); }, 250); 
        disassembleMode = false;
    });
    $('#mode-ebom').click();


    // EBOM Alignment
    $('#add-all').click(function() {
        $('.item-action-add:visible').click();
    });
    $('#deselect-all').click(function() {
        $('#ebom').find('.item.selected').each(function() {
            $(this).find('.item-title').click();
        });
        viewerResetSelection(true);
    });
    $('#toggle-colors').click(function() {
        viewerStatusColors = (viewerStatusColors) ? false : true;
        setStatusBar();
        setStatusBarFilter();
    });
    $('.bar').click(function() {
        $(this).siblings().removeClass('selected');
        $(this).toggleClass('selected');
        setStatusBar();
        setStatusBarFilter();
    })


    // MBOM Editing
    $('.panel-nav').click(function() {
        clickPanelNav($(this));
    });
    $('.panel-nav').first().click();
    $('#search-input').keypress(function (e) {
        if (e.which === 13) {
            searchItems('search-items', 'search-items-list', $('#search-input').val());
            $('#search-items-list').html('');
        }
    });
    $('#create-operation').click(function() {
        createItem('operation');
    });
    $('#create-end-item').click(function() {
        createItem('item');
    });
    $('#view-selector-ebom').change(function() {
        setWorkspaceView('ebom');
    });
    $('#view-selector-mbom').change(function() {
        setWorkspaceView('mbom');
    });
    $('input.list-search').keypress(function(e) {
        if(e.which === 13) {
            $('#add-processing').show().siblings().hide();
            let elemActive = $('.panel-nav.active').first();
            let query = elemActive.attr('data-query');
            let value = $(this).val();
            if(value !== '')  query = '(' + query + ')+AND+' + $(this).val();
            searchItems(elemActive.attr('data-id') + '-list', query);
        }
    });
    $('input.list-filter').keypress(function() {
        filterList($(this).val(), $(this).parent().next());
    });
    $('input.list-filter').keyup(function(e){
        if(e.keyCode == 8) filterList($(this).val(), $(this).parent().next());
    })  


    // Controls to add new operations in BOM
    $('#mbom-add-name').keypress(function (e) {
        insertNewProcess(e);
    });
    $('#mbom-add-code').keypress(function (e) {
        insertNewProcess(e);
    });


    // Copy items dialog
    $('#copy-cancel').click(function() { 
        $('#dialog-copy').hide();
        $('#overlay').hide();
        $('.item.to-move').removeClass('to-move');
    });
    $('#copy-move').click(function() { 
        moveItemQuantity();
    });
    $('#copy-add').click(function() { 
        addItemQuantity();
    });

 
    // Save Confirmation Dialog
    $('#confirm-saving').click(function() {
        if($(this).hasClass('disabled')) return;
        else {
            $('#overlay').hide();
            $('#dialog-saving').hide();
        }
    });

}
function selectTab(elemClicked) { 
    
    // override default tabs

    $('.panel-content').removeClass('hidden');

    elemClicked.addClass('selected');
    elemClicked.siblings().removeClass('selected');

}


function getInitialData() {

    let requests = [
        $.get('/plm/details'                , { 'wsId' : wsId, 'dmsId'  : dmsId }),
        $.get('/plm/bom-views-and-fields'   , { 'wsId' : wsEBOM.wsId }),
        $.get('/plm/sections'               , { 'wsId' : wsEBOM.wsId }),
        $.get('/plm/sections'               , { 'wsId' : wsMBOM.wsId }),
        $.get('/plm/workspace'              , { 'wsId' : wsEBOM.wsId }),
        $.get('/plm/tableaus'               , { 'wsId' : wsEBOM.wsId }),
        $.get('/plm/fields'                 , { 'wsId' : wsMBOM.wsId })
    ];

    if(wsEBOM.wsId === wsMBOM.wsId) {

        singleWorkspace = true;
        $('#nav-workspace-views-mbom').hide();

    } else {

        requests.push($.get('/plm/bom-views-and-fields' , { 'wsId' : wsMBOM.wsId }));
        requests.push($.get('/plm/workspace'            , { 'wsId' : wsMBOM.wsId }));
        requests.push($.get('/plm/tableaus'             , { 'wsId' : wsMBOM.wsId }));

    }

    Promise.all(requests).then(function(responses) {

        for(view of responses[1].data) {
            if(view.name.toLowerCase() === config.mbom.bomViewNameEBOM.toLowerCase()) {
                wsEBOM.viewId       = view.id;
                wsEBOM.viewColumns  = view.fields;
            }
        }

        $('#nav-workspace-views-ebom').html(responses[4].data.name);

        wsEBOM.tableaus = responses[5].data;

        insertViewOptions('ebom', wsEBOM.tableaus);

        if(wsEBOM.wsId === wsMBOM.wsId) {
        
            wsMBOM.viewId       = wsEBOM.viewId;
            wsMBOM.viewColumns  = wsEBOM.viewColumns;
        
        } else {

            $('#nav-workspace-views-mbom').html(responses[8].data.name);

            for(view of responses[7].data) {
                if(view.name === config.mbom.bomViewNameMBOM) {
                    wsMBOM.viewId       = view.id;
                    wsMBOM.viewColumns  = view.fields;
                }
            }

            wsMBOM.tableaus = responses[9].data;

            insertViewOptions('mbom', wsMBOM.tableaus);

        }

        wsEBOM.sections = responses[2].data;
        wsMBOM.sections = responses[3].data;
        wsMBOM.fields   = responses[6].data;

        for(column of wsMBOM.viewColumns) {

            console.log(column.fieldId);

                 if(column.fieldId === config.mbom.fieldIdEBOMItem    ) { linkFieldEBOMItem     = column.__self__.link; }
            else if(column.fieldId === config.mbom.fieldIdEBOMRootItem) { linkFieldEBOMRootItem = column.__self__.link; }
        }

        insertItemDetailsFields('create-item', null, wsMBOM.sections, wsMBOM.fields, null, true, true, true);
        processItemData(responses[0].data);

    });

}
function insertViewOptions(suffix, tableaus) {

    for(tableau of tableaus) {

        let elemOption = $('<option></option>');
            elemOption.attr('value', tableau.link);
            elemOption.html(tableau.title);
            elemOption.appendTo($('#view-selector-' + suffix));

    }

}



// Process Item Details and set BOM Trees
// function processItemData(itemDetails, fieldsEBOMView, fieldsMBOMView) {
function processItemData(itemDetails) {

    $('#header-subtitle').html(itemDetails.title);

    linkEBOM = getSectionFieldValue(itemDetails.sections, config.mbom.fieldIdEBOM, '', 'link');
    linkMBOM = getSectionFieldValue(itemDetails.sections, config.mbom.fieldIdMBOM + siteSuffix, '', 'link');
    
    if(linkEBOM !== '') {
        
        linkMBOM = '/api/v3/workspaces/' + wsId + '/items/' + dmsId;

        $.get('/plm/details', { 'link' : linkEBOM}, function(response) {
            basePartNumber = getSectionFieldValue(response.data.sections, config.mbom.fieldIdNumber, '', null);
            processRoots(itemDetails);
        });

    } else {

        linkEBOM = '/api/v3/workspaces/' + wsId + '/items/' + dmsId;
        basePartNumber = getSectionFieldValue(itemDetails.sections, config.mbom.fieldIdNumber, '', null);
        processRoots(itemDetails);

    }
}
function processRoots(itemDetails) {

    createMBOMRoot(itemDetails, function() {

        let requests = [];

        requests.push($.get('/plm/bom', {     
            'link'          : linkEBOM,
            'viewId'        : wsEBOM.viewId,
            'depth'         : 10,
            'revisionBias'  : config.mbom.revisionBias
        }));

        requests.push($.get('/plm/bom', {     
            'link'          : linkMBOM,
            'viewId'        : wsMBOM.viewId,
            'depth'         : 10,
            'revisionBias'  : config.mbom.revisionBias
        }));

        Promise.all(requests).then(function(responses) {

            eBOM = responses[0].data;
            mBOM = responses[1].data;

            linkEBOM = '/api/v3/workspaces/' + wsEBOM.wsId + '/items/' + eBOM.root.split('.')[5];
            linkMBOM = '/api/v3/workspaces/' + wsMBOM.wsId + '/items/' + mBOM.root.split('.')[5];

            eBOM.edges.sort(function(a, b){ return a.itemNumber - b.itemNumber });
            mBOM.edges.sort(function(a, b){ return a.itemNumber - b.itemNumber });

            insertViewer(linkEBOM);
            insertItemDetails(linkEBOM);
            insertAttachments(linkEBOM, 'attachments');
            initEditor();

        });
            
    });
        
}
function createMBOMRoot(itemDetails, callback) {

    if(linkMBOM !== '') {
        
        callback();
        
    } else {

        let params = {
            'wsId'      : wsMBOM.wsId,
            'sections'  : []
        };

        addFieldToPayload(params.sections, wsMBOM.sections, null, config.mbom.fieldIdEBOM, { 'link' : itemDetails.__self__ } );

        for(fieldToCopy of config.mbom.fieldsToCopy) {
            let value = getSectionFieldValue(itemDetails.sections, fieldToCopy, '', 'link');
            addFieldToPayload(params.sections, wsMBOM.sections, null, fieldToCopy, value);
        }

        if(!isBlank(config.mbom.fieldIdNumber)) {
            if(!isBlank(config.mbom.suffixItemNumber)) {
                basePartNumber += config.mbom.suffixItemNumber + siteLabel
                addFieldToPayload(params.sections, wsMBOM.sections, null, config.mbom.fieldIdNumber, basePartNumber);
            }
        }

        $.post({
            url         : '/plm/create', 
            contentType : 'application/json',
            data        : JSON.stringify(params)
        }, function(response) {
            console.log(response);
            if(response.error) {
                showErrorMessage('Error while creating MBOM root item, the editor cannot be used at this time. Please review your server configuration.', 'Error');
            } else {
                linkMBOM = response.data.split('.autodeskplm360.net')[1];
                storeMBOMLink();
                callback();
            }

        }); 

            
    }
    
}
function storeMBOMLink() {

    let timestamp  = new Date();
    let value      = timestamp.getFullYear() + '-' + (timestamp.getMonth()+1) + '-' + timestamp.getDate();
    let paramsEBOM = { 'link' : linkEBOM, 'sections'   : [] }

    addFieldToPayload(paramsEBOM.sections, wsEBOM.sections, null, config.mbom.fieldIdMBOM + siteSuffix, { 'link' : linkMBOM});
    addFieldToPayload(paramsEBOM.sections, wsEBOM.sections, null, config.mbom.fieldIdLastSync + siteSuffix, value);
    addFieldToPayload(paramsEBOM.sections, wsEBOM.sections, null, config.mbom.fieldIdLastUser + siteSuffix, $('#header-avatar').attr('title'));

    console.log(paramsEBOM);

    $.get('/plm/edit', paramsEBOM, function(response) {});


}
function initEditor() {
    
    $('#ebom').find('.processing').hide();
    $('#mbom').find('.processing').hide();

    setEBOM($('#ebom-tree'), eBOM.root, 1, null);
    setMBOM($('#mbom-tree'), mBOM.root, 1, null, '');

    $('#mbom-tree').find('.item-head').first().attr('id', 'mbom-root-head');
    $('#mbom-tree').find('.item').first().addClass('selected-target');
    
    $('#status-progress').remove();
    
    setTotalQuantities();
    setStatusBar();

    let elemMBOMRootBOM = $('#mbom-tree').find('.item-bom').first();
        elemMBOMRootBOM.attr('id', 'mbom-root-bom');
        elemMBOMRootBOM.sortable({
            
            delay       : 250,
            opacity     : 0.4,
            cursor      : 'move',
            cursorAt    : { left : 50, top : 15 },
            items       : '.item',
            placeholder : "sortable-placeholder",
            stop        : function(event, ui) {

                console.log('sorted!!!!');

                if(elemBOMDropped !== null) {
                    $(this).sortable('cancel');
                    ui.item.appendTo(elemBOMDropped);
                    elemBOMDropped = null;
                    console.log('sort deteced move');
                } else {
                    updateViewer();
                    moveItemInBOM(ui.item);
                }

            }

        });

    $('.bar').show();
    
}
function moveItemInBOM(elemItem) {

    let link = elemItem.attr('data-link');
    
    elemItem.siblings('.item').each(function() {
        
        if($(this).attr('data-link') === link) {
            
            let elemInput   = $(this).find('input.item-qty-input');
            let qty         = Number(elemInput.val());
            let elemQtyAdd  = elemItem.find('input.item-qty-input');

            elemInput.val(qty + Number(elemQtyAdd.val()));
            elemItem.remove();

        }
        
    });

}


// Set & update status bar
function setStatusBar() {
    
    let countAdditional = 0;
    let countDifferent  = 0;
    let countMatch      = 0;
    
    let listEBOM = [];
    let listMBOM = [];
    let qtysEBOM = [];
    let qtysMBOM = [];

    let listRed     = [];
    let listYellow  = [];
    let listGreen   = [];
    
    $('#ebom').find('.item').each(function() {
        if(!$(this).hasClass('item-has-bom')) {
            let urn = $(this).attr('data-urn');
            $(this).removeClass('additional');
            $(this).removeClass('different');
            $(this).removeClass('match');
            $(this).removeClass('neutral');
            $(this).removeClass('enable-update');
            if(listEBOM.indexOf(urn) === -1) {
                listEBOM.push(urn);
                qtysEBOM.push(Number($(this).attr('data-total-qty')));
            }
        }
    });

    $('#mbom').find('.item.is-ebom-item').each(function() {
        if(!$(this).hasClass('root')) {
            if(!$(this).hasClass('operation')) {
                if(!$(this).hasClass('mbom-item')) {

                    $(this).removeClass('additional');
                    $(this).removeClass('different');
                    $(this).removeClass('match');
                    $(this).removeClass('neutral');

                    let urn     = $(this).attr('data-urn');
                    let urnEBOM = $(this).attr('data-urn-ebom');
                
                    if(typeof urnEBOM !== 'undefined') urn = urnEBOM;

                    let index = listMBOM.indexOf(urn);
                    //let qty = $(this).attr('data-qty');
                    let qty   = Number($(this).find('.item-qty-input').val());

                    if(index === -1) {
                        listMBOM.push(urn);
                        qtysMBOM.push(qty);
                    } else {
                        qtysMBOM[index] += qty;
                    }
                }
            }
        }
    });
    
    $('#ebom').find('.item').each(function() {
        let partNumber = $(this).attr('data-part-number');
        if(!$(this).hasClass('item-has-bom')) {
            let urn     = $(this).attr('data-urn');
            let index   = listMBOM.indexOf(urn); 
            let qty     = qtysEBOM[listEBOM.indexOf(urn)];
            if(listMBOM.indexOf(urn) === -1) {
                countAdditional++;
                if(listRed.indexOf(partNumber) === -1) listRed.push(partNumber);
                $(this).addClass('additional');
            } else if(qtysMBOM[index] === qty) {
                $(this).addClass('match');
                countMatch++;
                if(listGreen.indexOf(partNumber) === -1) listGreen.push(partNumber);
            } else {
                $(this).addClass('different');
                countDifferent++;
                if(listYellow.indexOf(partNumber) === -1) listYellow.push(partNumber);
                if($(this).attr('data-instance-qty') === $(this).attr('data-total-qty')) {  

                    let countMBOMInstances = 0;

                    $('#mbom').find('.item').each(function() {

                        let urnMBOM = $(this).attr('data-urn');
                        if(urn === urnMBOM) {
                            countMBOMInstances++;
                        }

                    });

                    if(countMBOMInstances === 1) $(this).addClass('enable-update');
                }
            }
            
        }
    });

    $('#mbom').find('.item.is-ebom-item').each(function() {
        if($(this).hasClass('mbom-item')) {
            $(this).addClass('unique');
        } else if(!$(this).hasClass('root')) {
            if(!$(this).hasClass('operation')) {
                
                let urn     = $(this).attr('data-urn');
                let urnEBOM = $(this).attr('data-urn-ebom');
                
                if(typeof urnEBOM !== 'undefined') urn = urnEBOM;
                
                let index   = listEBOM.indexOf(urn); 
                let qty     = qtysMBOM[listMBOM.indexOf(urn)];

                if(index === -1) {
                    countAdditional++;
                    $(this).addClass('additional');
                } else if(qtysEBOM[index] === qty) {
                    $(this).addClass('match');
                } else {
                    $(this).addClass('different');
                }
            }
        }
    });
    
    $('#status-additional').css('flex', countAdditional + ' 1 0%');
    $('#status-different').css('flex', countDifferent + ' 1 0%');
    $('#status-match').css('flex', countMatch + ' 1 0%');
    
    if(countAdditional === 0) $('#status-additional').css('border-width', '0px');  else $('#status-additional').css('border-width', '5px');
    if(countDifferent  === 0) $('#status-different' ).css('border-width', '0px');  else $('#status-different' ).css('border-width', '5px');
    if(countMatch      === 0) $('#status-match'     ).css('border-width', '0px');  else $('#status-match'     ).css('border-width', '5px');
    
    if(!viewerStarted) return; 

    if(viewerStatusColors) {
        viewerSetColors(listRed    , config.vectors.red);
        viewerSetColors(listYellow , config.vectors.yellow);
        viewerSetColors(listGreen  , config.vectors.green);
    } else {
        viewerResetColors();
    }

}


// Input controls to add new items to MBOM
function insertNewProcess(e) {
    
    if (e.which == 13) {

        if($('#mbom-add-name').val() === '') return;

        let elemNew = getBOMNode(2, '', '', '', '', $('#mbom-add-name').val(), '', '', '', $('#mbom-add-code').val(), 'radio_button_unchecked', '', 'mbom', '', false);
            elemNew.attr('data-parent', '');
            elemNew.addClass('operation');
            elemNew.addClass('neutral');
        
        let elemBOM = $('#mbom-tree').children().first().children('.item-bom').first();

        if(disassembleMode) elemBOM.prepend(elemNew);
        else elemBOM.append(elemNew);

        selectProcess(elemNew);
        
        $('#mbom-add-name').val('');
        $('#mbom-add-code').val('');
        $('#mbom-add-name').focus();
        
    }
    
}


// Display EBOM information
function setEBOM(elemParent, urn, level, qty) {

    let descriptor  = getDescriptor(eBOM, urn);
    let nodeLink    = getLink(eBOM, urn);
    let rootLink    = getRootLink(eBOM, urn);
    let partNumber  = getNodeProperty(eBOM, urn, wsEBOM.viewColumns, config.viewer.fieldIdPartNumber, '');
    let category    = getNodeProperty(eBOM, urn, wsEBOM.viewColumns, config.mbom.fieldIdCategory, '');
    let type        = getNodeProperty(eBOM, urn, wsEBOM.viewColumns, 'TYPE', '');
    let code        = getNodeProperty(eBOM, urn, wsEBOM.viewColumns, config.mbom.fieldIdProcessCode, '');
    let icon        = getIconClassName(nodeLink);
    let endItem     = getNodeProperty(eBOM, urn, wsEBOM.viewColumns, config.mbom.fieldIdEndItem, '');
    let ignoreMBOM  = getNodeProperty(eBOM, urn, wsEBOM.viewColumns, config.mbom.fieldIdIgnoreInMBOM, '');
    let hasMBOM     = getNodeURN(eBOM, urn, wsEBOM.viewColumns, config.mbom.fieldIdMBOM + siteSuffix, '');
    let isLeaf      = isEBOMLeaf(level, urn, hasMBOM, endItem);

    if(ignoreMBOM !== 'true') {
    
        let elemNode = getBOMNode(level, urn, nodeLink, rootLink, rootLink, descriptor, partNumber, category, type, code, icon, qty, 'ebom', hasMBOM, isLeaf);
            elemNode.appendTo(elemParent);
            
        if(hasMBOM !== '') elemNode.attr('data-urn-mbom', hasMBOM);

        if(level === 1) elemNode.addClass('root');
        else elemNode.addClass('leaf');
        
    }
    
}
function isEBOMLeaf(level, urn, hasMBOM, endItem) {
    
    if(level === 1) return false;
    if(hasMBOM !== '') return true;
    if(endItem === 'true') return true;
    
    for(edgeEBOM of eBOM.edges) {
        if(edgeEBOM.parent === urn) {
            if(getNodeProperty(eBOM, edgeEBOM.child, wsEBOM.viewColumns, config.mbom.fieldIdIgnoreInMBOM, '') !== true) {
                return  false;   
            }
        }
    }
        
    return true;
    
}
function getBOMNode(level, urn, nodeLink, rootLink, linkEBOMRoot, descriptor, partNumber, category, type, code, icon, qty, bomType, bomMatch, isLeaf) {
    
    category = category.replace(/ /g, '-');
    category = category.toLowerCase();

    type = type.replace(/ /g, '-');
    type = type.toLowerCase();

    let elemNode = $('<div></div>');
        elemNode.addClass('item');
        elemNode.attr('category', category);
        elemNode.attr('data-code', code);
        elemNode.attr('data-urn', urn);
        elemNode.attr('data-link', nodeLink);
        elemNode.attr('data-root', rootLink);
        elemNode.attr('data-ebom-root', linkEBOMRoot);
        elemNode.attr('data-part-number', partNumber);
    
    let elemNodeHead = $('<div></div>');
        elemNodeHead.addClass('item-head');
        elemNodeHead.appendTo(elemNode);
    
    let elemNodeToggle = $('<div></div>');
        elemNodeToggle.addClass('item-toggle');
        elemNodeToggle.appendTo(elemNodeHead);
    
    let elemNodeIcon = $('<div></div>');
        elemNodeIcon.addClass('item-icon');
        elemNodeIcon.html('<span class="icon radio-unchecked">' + icon + '</span><span class="icon radio-checked">radio_button_checked</span>');
        elemNodeIcon.appendTo(elemNodeHead);
    
    let elemNodeTitle = $('<div></div>');
        elemNodeTitle.addClass('item-title');
        elemNodeTitle.appendTo(elemNodeHead);
        elemNodeTitle.attr('title', descriptor);
    
    let elemNodeDescriptor = $('<span></span>');
        elemNodeDescriptor.addClass('item-descriptor');
        elemNodeDescriptor.html(descriptor);
        elemNodeDescriptor.appendTo(elemNodeTitle);

    let elemNodeLink = $('<span class="icon">open_in_new</span>');
        elemNodeLink.addClass('item-link');
        elemNodeLink.attr('title', 'Click to open given item in PLM in a new browser tab');
        elemNodeLink.appendTo(elemNodeTitle);
        elemNodeLink.click(function(event) {

            event.stopPropagation();
            event.preventDefault();
            
            let elemItem = $(this).closest('.item');
            let link     = elemItem.attr('data-link');
            
            if(link === '') {
                alert('Item does not exist yet. Save your changes to the database first.');
            } else {
                openItemByLink(link);
            }
            
        });

    let elemNodeFilter = $('<span class="icon">filter_list</span>');
        elemNodeFilter.addClass('item-link');
        elemNodeFilter.attr('title', 'Click to toggle filter for this component in viewer, EBOM and MBOM');
        elemNodeFilter.appendTo(elemNodeTitle);
        elemNodeFilter.click(function(event) {

            event.stopPropagation();
            event.preventDefault();

            selectBOMItem($(this), true);
            
        });

    let elemNodeCode = $('<div></div>');
        elemNodeCode.addClass('item-code');
        elemNodeCode.html(code);
        elemNodeCode.attr('title', 'Process Code');
        elemNodeCode.appendTo(elemNodeHead);

    let elemNodeQty = $('<div></div>');
        elemNodeQty.addClass('item-qty');
        elemNodeQty.appendTo(elemNodeHead);
    
    let elemQtyInput = $('<input></input>');
        elemQtyInput.attr('type', 'number');
        elemQtyInput.attr('title', 'Quantity');
        elemQtyInput.addClass('item-qty-input');
        elemQtyInput.appendTo(elemNodeQty);
    
    let elemNodeStatus = $('<div></div>');
        elemNodeStatus.addClass('item-status');
        elemNodeStatus.attr('title', 'EBOM / MBOM match indicator\r\n- Green : match\r\n- Red : missing in MBOM\r\n- Orange : quantity mismatch');
        elemNodeStatus.appendTo(elemNodeHead);
    
    let elemNodeActions = $('<div></div>');
        elemNodeActions.addClass('item-actions');
        elemNodeActions.appendTo(elemNodeHead);
    
    if(qty !== null) {
        elemQtyInput.val(qty);
        elemNodeHead.attr('data-qty', qty);
        elemNodeTitle.attr('data-qty', qty);
        elemNode.attr('data-qty', qty);
    };
    
    if(category !== '') elemNode.addClass('category-' + category);
    if(type     !== '') elemNode.addClass('type-' + type);
    

    // console.log('bomType === ' + bomType);

    if(bomType === 'ebom') {

        elemNode.addClass('is-ebom-item');
        elemQtyInput.attr('disabled', 'disabled');
        
//        if(level === 2) {
//        
//            let elemActionAdd = addAction('Add', elemNodeActions);
//                elemActionAdd.addClass('item-action-add');
//                elemActionAdd.click(function() {
//                    insertFromEBOMToMBOM($(this));
//                });
//
//            let elemActionUpdate = addAction('Update', elemNodeActions);
//                elemActionUpdate.addClass('item-action-update');
//                elemActionUpdate.click(function() {
//                    updateFromEBOMToMBOM($(this));
//                });
//            
//        }


        elemNodeIcon.attr('title', 'EBOM item');
        elemNodeTitle.click(function(e) {
            e.stopPropagation();
            e.preventDefault();
            selectBOMItem($(this), false);
        });

        // console.log('isLeaf = ' + isLeaf);
        
        if(!isLeaf) {
            
            elemNode.addClass('item-has-bom');
        
            let elemNodeBOM = $('<div></div>');
                elemNodeBOM.addClass('item-bom');
                elemNodeBOM.appendTo(elemNode);
    
            for(edgeEBOM of eBOM.edges) {
                if(edgeEBOM.depth === level) {
                    if(edgeEBOM.parent === urn) { 
                        let childQty = Number(getEdgeProperty(edgeEBOM, wsEBOM.viewColumns, 'QUANTITY', '0.0'));
                       //childQty = precisionRound(childQty, -1);

                        setEBOM(elemNodeBOM, edgeEBOM.child, level + 1, childQty);
                    }
                }
            }

        
//        if(level > 1) addBOMToggle(elemNodeHead);
        
//            let elemNodeToggle = elemNode.find('.item-toggle');
        
            if(level > 1) addBOMToggle(elemNodeToggle);

            let elemActionAdd = addAction('Add', elemNodeActions);
                elemActionAdd.addClass('item-action-add');
                elemActionAdd.click(function() {
                    let elemBOM = $(this).closest('.item-head').next();
                    elemBOM.children().each(function() {
                        if(!$(this).hasClass('match')) {
                            $(this).find('.item-action-add:visible').click();
                        }
                    }); 
                });
            
            
        } else {

            if(bomMatch !== '') addMBOMShortcut(elemNodeToggle, urn);
           
            let elemActionAdd = addAction('Add', elemNodeActions);
                elemActionAdd.addClass('item-action-add');
                elemActionAdd.attr('title', 'Add this component with matching quantity to MBOM on right hand side');
                elemActionAdd.click(function() {
                    insertFromEBOMToMBOM($(this));
                    setStatusBar();
                    setStatusBarFilter();
                });

            let elemActionUpdate = addAction('Update', elemNodeActions);
                elemActionUpdate.addClass('item-action-update');
                elemActionUpdate.click(function() {
                    updateFromEBOMToMBOM($(this));
                    setStatusBar();
                    setStatusBarFilter();
                });


            
        }
        
    } else {
                
        insertMBOMSelectEvent(elemNode);
        insertMBOMQtyInputControls(elemQtyInput);
        insertMBOMActions(elemNodeActions);

        // TODO load instructions at startup
        // let note = getEdgeProperty(edgeEBOM, wsMBOM.viewColumns, config.mbom.fieldIdInstructions, '');
                        
        // instructions.push({
        //     'link'      : nodeLink,
        //     'edge'      : edgeEBOM,
        //     'note'      : note,
        //     'markup'    : ''
        // });
        
        if(bomMatch !== '') addMBOMShortcut(elemNodeToggle, bomMatch);

        if(isLeaf) {
            
            $('#ebom').find('.item').each(function() {
            
                var urnEBOM = $(this).attr('data-urn');
                var catEBOM = $(this).attr('category');
                if(urnEBOM === urn) {
                    if(typeof urnEBOM !== 'undefined') {
                        elemNode.addClass(catEBOM);
                    }
                }
            
            });
        
        } else {
            
            let elemNodeBOM = $('<div></div>');
                elemNodeBOM.addClass('item-bom');
                elemNodeBOM.appendTo(elemNode);

            // if(level === 2)  {

                // elemNodeBOM.droppable({
                elemNodeHead.droppable({
                    
                    classes: {
                        'ui-droppable-hover': 'drop-hover'
                    },
                    drop : function(event, ui) {

                        let itemDragged      = ui.draggable;
                        let isAdditionalItem = itemDragged.hasClass('additional-item');
                        let link             = itemDragged.attr('data-link');
                        let isNew            = true;

                        elemBOMDropped = $(this).next();

                        elemBOMDropped.children('.item').each(function() {

                            if($(this).attr('data-link') === link) {
                                
                                isNew = false;
                                let elemInput = $(this).find('input.item-qty-input');
                                let qty = elemInput.val();
                                
                                if(isAdditionalItem)  {
                                    qty++;
                                } else  {
                                    let elemQtyAdd = itemDragged.find('input.item-qty-input');
                                    qty += elemQtyAdd.val();
                                    itemDragged.remove();
                                }

                                elemInput.val(qty);

                            }
                        });

                        if(isAdditionalItem) {

                            if(isNew) insertAdditionalItem($(this), itemDragged.html(), itemDragged.attr('data-urn'), itemDragged.attr('data-link'));
                    
                        }

                    }
                });

        // }
            
            if(level > 1) addBOMToggle(elemNodeToggle);

            elemNode.click(function(e) {
                e.stopPropagation();
                e.preventDefault();
                selectProcess($(this));
            });
            
        }
    }
    
    return elemNode;
    
}
function getEdgeProperty(edge, cols, fieldId, defValue) {
    
    let id = getViewFieldId(cols, fieldId);
    
    for(field of edge.fields) {
        
        let fieldIdBOM  = Number(field.metaData.link.split('/')[10]);
        if(fieldIdBOM === id) return field.value;
    }
    
    return defValue;
    
}
function getNodeProperty(list, urn, cols, fieldId, defValue) {

    let id = getViewFieldId(cols, fieldId);

    if(id === '') return defValue;
    
    for(node of list.nodes) {
        
        if(node.item.urn === urn) {

            for(field of node.fields) {

                let fieldId = Number(field.metaData.link.split('/')[10]);
                
                if(id === fieldId) {
                    if(typeof field.value === 'object') {
                        return field.value.title;
                    } else {
                        return field.value;    
                    }
                }
                
            }
            
            return defValue;
            
        }
        
    }
    
    return defValue;
    
}
function getNodeURN(list, urn, cols, fieldId, defValue) {

    let id = getViewFieldId(cols, fieldId);
  
    if(id === '') return defValue;
    
    for(node of list.nodes) {
        
        if(node.item.urn === urn) {
            
            for(field of node.fields) {
                
                let fieldId = Number(field.metaData.link.split('/')[10]);
                
                if(id === fieldId) {
                    if(typeof field.value === 'object') {
                        return field.value.urn;
                    } else {
                        return field.value;    
                    }
                }
                
            }
            
            return defValue;
            
        }
        
    }
    
    return defValue;
    
}
function getViewFieldId(cols, fieldId) {
    
    for(col of cols) {
        if(col.fieldId === fieldId) return col.viewDefFieldId;
    }
    
    return '';
    
}
function insertFromEBOMToMBOM(elemAction) {
    
    let elemItem    = elemAction.closest('.item');
    let code        = elemItem.attr('data-code');
    let category    = elemItem.attr('category');
    let elemTarget  = $('#mbom').find('.root');
    let operationMatch = false;
    
    if(code !== '') {
        if($('.operation').length > 0) {
            
            $('.operation').each(function() {
                if(!operationMatch) {
                    let operationCode = $(this).attr('data-code');
                    if(operationCode === code) {
                        operationMatch = true;
                        elemTarget = $(this); 
                    }
                };
            });
            
        }
    }

    if(!operationMatch) {
        elemTarget = $('.selected-target');
    }
    
    if(elemTarget !== null) {   
        
        let clone = elemItem.clone(true, true);
            
            if(disassembleMode) {
                clone.prependTo(elemTarget.find('.item-bom').first());
            } else {
                clone.appendTo(elemTarget.find('.item-bom').first());
            }
            clone.click(function(e) {
                // console.log('new target clicked');
            });
        
        let elemQtyInput = clone.find('.item-qty-input');
            elemQtyInput.removeAttr('disabled');
            elemQtyInput.keyup(function (e) {
                //if (e.which == 13) {
                    // $(this).closest('.item').attr('data-qty', $(this).val());
                    $(this).closest('.item').attr('data-instance-qty', $(this).val());
                    setStatusBar();
                    setBOMPanels($(this).closest('.item').attr('data-link'));
                //}
            });
            elemQtyInput.click(function(e) {
                e.stopPropagation();
                e.preventDefault();
                $(this).select();
            });

        let elemActions = clone.find('.item-actions');
            elemActions.html('');

        insertMBOMActions(elemActions);

    }
    

}
function updateFromEBOMToMBOM(elemAction) {
    
    let elemItem    = elemAction.closest('.item');
    let link        = elemItem.attr('data-link');
    let qty         = elemItem.attr('data-instance-qty');
    
    let listMBOM = $('#mbom').find('[data-link="' + link + '"]');
    
    if(listMBOM.length === 1) {
        listMBOM.find('.item-qty-input').val(qty);
        setStatusBar();
        if(elemItem.hasClass('selected')) setBOMPanels(link);
    }
    
}


// Display MBOM information
function setMBOM(elemParent, urn, level, qty, urnParent) {

    let descriptor   = getDescriptor(mBOM, urn);
    let nodeLink     = getLink(mBOM, urn);
    let rootLink     = getRootLink(mBOM, urn);
    let partNumber   = getNodeProperty(mBOM, urn, wsMBOM.viewColumns, config.viewer.fieldIdPartNumber, '');
    let category     = getNodeProperty(mBOM, urn, wsMBOM.viewColumns, 'TYPE', '');
    let type         = getNodeProperty(mBOM, urn, wsMBOM.viewColumns, 'TYPE', '');
    let code         = getNodeProperty(mBOM, urn, wsMBOM.viewColumns, config.mbom.fieldIdProcessCode, '');
    let edge         = getMBOMEdge(urn, urnParent);
    let edges        = [];
    let isProcess    = isMBOMProcess(urn, level);
    let isEBOMItem   = checkEBOMItem(edge);
    let linkEBOMRoot = getEdgeProperty(edge, wsMBOM.viewColumns, config.mbom.fieldIdEBOMRootItem, '');
    let hasEBOM      = getNodeURN(mBOM, urn, wsMBOM.viewColumns, config.mbom.fieldIdEBOM, '');
    let icon         = getIconClassName(nodeLink, isProcess, isEBOMItem);
    let isLeaf       = isMBOMLeaf(urn, level, code);
    let itemNumber   = getMBOMEdgeNumber(urn, urnParent);

    let hasInstructions = hasNodeInstructions(edge.edgeId, partNumber, nodeLink);


    // 'radio_button_unchecked'

    // isProcess = (type === 'Process') ? true : false;

    // if(level === 1) hasEBOM = '';
    // else if(hasEBOM !== '') { isLeaf = true; isProcess = false; icon = 'view_in_ar'; }

    // isProcess = (isBlank(isProcess)) ? false : 

    // console.log(level + ' / ' + hasEBOM + ' / ' + isProcess);

    if(isProcess) isLeaf = false;
    
    let elemNode = getBOMNode(level, urn, nodeLink, rootLink, linkEBOMRoot, descriptor, partNumber, category, type, code, icon, qty, 'mbobm', hasEBOM, isLeaf);
//        elemNode.addClass('neutral');
        elemNode.attr('data-parent', urnParent);
        elemNode.attr('data-edge', edge.edgeId);
        elemNode.attr('data-edges', '');
        // elemNode.attr('data-ebom-item', isEBOMItem);
        // elemNode.attr('data-number', itemNumber);
        elemNode.attr('data-number-db', itemNumber);
        elemNode.appendTo(elemParent);   
    
    if(isEBOMItem) { 
        elemNode.addClass('is-ebom-item'); 
    } else { 
        elemNode.addClass('mbom-item');    
        // elemNode.attr('title', 'This is a manufacturing specific item which is not contained in the EBOM');
    }

    if(hasEBOM !== '') {
        elemNode.attr('data-urn-ebom', hasEBOM);
        elemNode.attr('data-urn-mbom', urn);
        
        $('#ebom').find('.leaf').each(function() {
            
            let urnEBOM = $(this).attr('data-urn');
            
            if(urnEBOM === hasEBOM) {
                
                let titleEBOM = $(this).find('.item-title').first().html();
                let codeEBOM = $(this).find('.item-code').first().html();

                let classNames = $(this).attr('class').split(' ');

                for(className of classNames) {

                    if(className.indexOf('category-') === 0) elemNode.addClass(className);

                }
                
                elemNode.find('.item-title').first().html(titleEBOM);
                elemNode.find('.item-code').first().html(codeEBOM);
                elemNode.removeClass('mbom-item');
                
            }
            
        });
        
        
    }
    
    if(level === 1) {
        elemNode.addClass('root');
    } else if(isProcess) {
        if(level === 2) {
            elemNode.addClass('neutral');
            elemNode.addClass('operation');
        }
    }

    // if(icon === 'factory') {
    //     elemNode.attr('title', 'This is a manufacturing specific item being managed in the Items & BOMS workspace');
    //     elemNode.addClass('mbom-item');
    // }
    
    if(isLeaf) {

        elemNode.addClass('leaf');

    } else {
        
        let elemNodeBOM = elemNode.find('.item-bom').first();
        
        for(edgeMBOM of mBOM.edges) {
            if(edgeMBOM.depth === level) {
        
                if(edgeMBOM.parent === urn) {
                    edges.push(edgeMBOM.edgeId);
                    let childQty = Number(getEdgeProperty(edgeMBOM, wsMBOM.viewColumns, 'QUANTITY', '0.0'))
                    setMBOM(elemNodeBOM, edgeMBOM.child, level + 1, childQty, urn);
                }
            }
        }
        
        
        elemNode.attr('data-edges', edges.toString());
        
    }
    
//    if(level === 1) 
    
}
function isMBOMProcess(urn, level)  {

    if(level === 1) return true;

    let isProcess = getNodeProperty(mBOM, urn, wsMBOM.viewColumns, config.mbom.fieldIdIsProcess, '');

    if(isBlank(isProcess)) {
        return false;
    } else if(isProcess.toUpperCase() === 'TRUE') {
        return true;
    }
    
    return false;

}
function checkEBOMItem(edge)  {

    let isEBOMItem = getEdgeProperty(edge, wsMBOM.viewColumns, config.mbom.fieldIdEBOMItem, 'false');
    
    return (isEBOMItem.toLowerCase() === 'true')
    
}
function isMBOMLeaf(urn, level, code) {
    
    if(level === 1) return false;    
//    if(level === 2) return false;
    if(level === 3) return true;
    
    for(edgeMBOM of eBOM.edges) {
        if(edgeMBOM.parent === urn) return false;
    }
    
    return true;
    
}
function addAction(label, elemParent) {
    
    let elemAction = $('<div></div>');
        elemAction.addClass('item-action');
        elemAction.html(label);
        elemAction.appendTo(elemParent);
    
    return elemAction;

}
function addActionIcon(icon, elemParent) {
    
    let elemAction = $('<div></div>');
        elemAction.addClass('item-action');
        elemAction.addClass('icon');
        elemAction.addClass('icon');
        elemAction.html(icon);
        elemAction.appendTo(elemParent);
    
    return elemAction;

}
function insertMBOMSelectEvent(elemItem) {

    elemItem.click(function(e) {
        e.stopPropagation();
        e.preventDefault();
        selectBOMItem($(this), false);
    });

}
function insertMBOMQtyInputControls(elemQtyInput) {

    elemQtyInput.click(function(e) {
        e.stopPropagation();
        e.preventDefault();
        $(this).select();
    });

    elemQtyInput.on("change paste keyup", function(e) {
        $(this).closest('.item').attr('data-instance-qty', $(this).val());
        setStatusBar();
        setBOMPanels($(this).closest('.item').attr('data-link'));
    });

    elemQtyInput.focusout(function() {
        $('body').removeClass('bom-panel-on');
    });

    elemQtyInput.attr('title', 'Set quantity of this component');


}
function insertMBOMActions(elemActions) {

    elemActions.html('');

    let elemActionVisibility = addActionIcon('visibility', elemActions);
        elemActionVisibility.attr('title', 'Only show components in viewer required until this step');
        elemActionVisibility.addClass('button-view');
        elemActionVisibility.click(function(event) {

            event.stopPropagation();
            event.preventDefault();
            
            let elemClicked = $(this).closest('.item');
            let isSelected  = $(this).hasClass('selected');

            $('.button-view').removeClass('selected');

            if(isSelected) {

                $('#mbom-root-bom').find('.item').removeClass('invisible');
                viewer.setGhosting(true);
                viewer.showAll();
          
            } else {   

                $(this).addClass('selected');
                $('#mbom-root-bom').find('.item').addClass('invisible');
                viewerHideInvisibleItems(elemClicked);

            }

        });

    let elemActionRemove = addActionIcon('delete_forever', elemActions);
        elemActionRemove.attr('title', 'Remove this component instance from MBOM');
        elemActionRemove.addClass('button-remove');
        elemActionRemove.click(function() {

            event.stopPropagation();
            event.preventDefault();

            $(this).closest('.item').remove();
            restoreAssembly();
            setStatusBar();
            setStatusBarFilter();

        });

    let elemItem = elemActions.closest('.item');

    let elemActionCopy = addActionIcon('content_copy', elemActions);
        elemActionCopy.attr('title', 'Copy this item to selected target');
        elemActionCopy.addClass('button-copy');
        elemActionCopy.click(function(event) {
        
            event.stopPropagation();
            event.preventDefault();

            let item        = $(this).closest('.item');
            let itemName    = item.find('.item-descriptor').first().html();
            let itemQty     = item.find('.item-qty-input').val();
            let target      = $(this).closest('.selected-target');
            let targetName  = target.find('.item-descriptor').first().html();

            $('.to-move').removeClass('to-move');
            item.addClass('to-move');

            $('#move-item-name').html(itemName);
            $('#move-target-name').html(targetName);
            $('#dialog-copy').attr('item-qty', itemQty);
            $('#dialog-copy').show();
            $('#overlay').show();
            $('#copy-qty').val(itemQty);
            $('#copy-qty').select();

        });

}
function hasNodeInstructions(edge, partNumber, nodeLink) {

    if(edge !== '') {
        for(edgeMBOM of mBOM.edges) {
            if(edgeMBOM.edgeId === edge) {

                let note    = getEdgeProperty(edgeMBOM, wsMBOM.viewColumns, config.mbom.fieldIdInstructions, '');
                let svg     = getEdgeProperty(edgeMBOM, wsMBOM.viewColumns, config.mbom.fieldIdMarkupSVG   , '');
                let state   = getEdgeProperty(edgeMBOM, wsMBOM.viewColumns, config.mbom.fieldIdMarkupStage , '');
                            
                instructions.push({
                    'partNumber' : partNumber,
                    'link'       : nodeLink,
                    'edge'       : edgeMBOM,
                    'note'       : note,
                    'svg'        : svg,
                    'state'      : state,
                    'changed'    : false
                });

                return (note !== '');

            }
        }
    }

    return false;
    // console.log(instructions);


}


// Parse BOM information
function getDescriptor(data, urn) {
    
    for(node of data.nodes) {
        if(node.item.urn === urn) {
            return node.item.title;
        }
    }
    
    return '';
    
}
function getLink(data, urn) {
    
    for(node of data.nodes) {
        if(node.item.urn === urn) {
            return node.item.link;
        }
    }
    
    return '';
    
}
function getRootLink(data, urn) {
    
    for(node of data.nodes) {
        if(node.item.urn === urn) {
            return node.rootItem.link;
        }
    }
    
    return '';
    
}
function getMBOMEdge(urn, urnParent) {
    
    let empty = { 'edgeId' : '', 'fields': [] }

    if(urnParent === '') return empty;
    
    for(edge of mBOM.edges) {
        if(edge.child === urn) {
            if(edge.parent === urnParent) {
                return edge;
            }
        }
    }
    
    return empty;
    
}
function getMBOMEdgeNumber(urn, urnParent) {
    
    if(urnParent === '') return -1;
    
    for(edge of mBOM.edges) {
        if(edge.child === urn) {
            if(edge.parent === urnParent) {
                return edge.itemNumber;
            }
        }
    }
    
    return -1;

}


// Toggles to expand / collapse BOMs
function addBOMToggle(elemParent) {
    
    let elemNodeTogglePlus = $('<div></div>');
        elemNodeTogglePlus.css('display', 'none');
        elemNodeTogglePlus.html('<span class="icon chevron-right">chevron_right</span>');
        elemNodeTogglePlus.appendTo(elemParent);
        elemNodeTogglePlus.click(function(event) {
            
            event.preventDefault();
            event.stopPropagation();

            if(event.shiftKey) { 
                let elemRoot = $(this).closest('.root');
                elemRoot.find('.chevron-right:visible').click();
            } else {
                $(this).closest('.item').find('.item-bom').show(); 
                $(this).siblings().toggle();
                $(this).toggle();
            };
            
        });
    
    let elemNodeToggleMinus = $('<div></div>');
        elemNodeToggleMinus.html('<span class="icon expand-more">expand_more</span>');
        elemNodeToggleMinus.appendTo(elemParent);
        elemNodeToggleMinus.click(function(event) {

            event.preventDefault();
            event.stopPropagation();
            
            if(event.shiftKey) { 
                let elemRoot = $(this).closest('.root');
                elemRoot.find('.expand-more:visible').click();
            } else {
                $(this).closest('.item').find('.item-bom').hide(); 
                $(this).siblings().toggle();
                $(this).toggle();
            }
            
        });
    
}


// Add Shortcut to open related MBOM
function addMBOMShortcut(elemParent, urn) {
    
    let elemMBOM = $('<div></div>');
        elemMBOM.addClass('icon');
        elemMBOM.addClass('mbom-shortcut');
        elemMBOM.appendTo(elemParent);
        elemMBOM.click(function(event) {

            let url = '/mbom';
                url += '?options=' + options;
                url += '&wsId=' + urn.split('.')[4];
                url += '&dmsId=' + urn.split('.')[5];
                        
            window.open(url);

        });
    
}


// Calculate total quantities
function setTotalQuantities() {

    let urns = [];
    let qtys = [];

    $('#ebom').find('.item-qty-input').each(function() {

        let elemQtyInput = $(this);

        if(elemQtyInput.parent().parent().siblings().length === 0) {
            
            let totalQuantity   = Number(elemQtyInput.val());
            let elemItem        = elemQtyInput.closest('.item');
            let urn             = elemItem.attr('data-urn');

            elemQtyInput.parents('.item-has-bom').each(function() {
                if(this.hasAttribute('data-qty')) {
                    totalQuantity = totalQuantity * Number($(this).attr('data-qty'));
                }
            })

            elemItem.attr('data-instance-qty', totalQuantity);
            elemQtyInput.val(totalQuantity);

            if(urns.indexOf(urn) === -1) {
                urns.push(urn);
                qtys.push(totalQuantity);
            } else {
                qtys[urns.indexOf(urn)] += totalQuantity;
            }

        }
    });

    $('#ebom').find('.item-qty-input').each(function() {
    
        let elemItem = $(this).closest('.item');
        let urn = elemItem.attr('data-urn');

        elemItem.attr('data-total-qty', qtys[urns.indexOf(urn)]);

    });

}


// Enable item filtering & preview
function selectProcess(elemClicked) {

    $('.item').removeClass('selected');
    $('.selected-target').removeClass('selected-target');
    
    elemClicked.addClass('selected-target');
    elemClicked.addClass('selected');

    insertItemDetails(elemClicked.attr('data-link'));

}
function selectBOMItem(elemClicked, filter) {

    let elemItem = elemClicked.closest('.item');

    if(filter) {
        if(elemItem.hasClass('filter')) deselectItem(elemClicked);
        else selectItem(elemItem, filter);
    } else {
        if(elemItem.hasClass('selected'))  deselectItem(elemClicked);
        else selectItem(elemItem, filter);
    }

}
function selectItem(elemItem, filter) {   

    let link        = elemItem.attr('data-link');
    let isSelected  = elemItem.hasClass('selected');
    let partNumber  = elemItem.attr('data-part-number');
    
    if(typeof partNumber === 'undefined') partNumber = '';

    if(elemItem.hasClass('leaf')) {

        setStatusBar();

        if(filter) {
            viewer.setGhosting(false);
            $('.leaf').hide();
            $('.operation').hide();
            $('.item.filter').removeClass('filter');
            elemItem.addClass('filter');
        } else {
            viewer.setGhosting(true);
        }

        $('.item').removeClass('selected');

        $('.leaf').each(function() {
            
            if($(this).attr('data-link') === link) {

                $(this).show();
                $(this).addClass('selected');
                unhideParent($(this).parent());

                if(partNumber === '') partNumber = $(this).attr('data-part-number');
                if(typeof partNumber === 'undefined') partNumber = '';

            // } else if($(this).attr('data-urn-bom') === urn) {
            //     $(this).show();
            //     $(this).addClass('selected');
            //     unhideParent($(this).parent());
            // }else if($(this).attr('data-urn-ebom') === urn) {
            //     $(this).show();
            //     $(this).addClass('selected');
            //     unhideParent($(this).parent());
            }

        });

        if(!isSelected) {
            if(partNumber !== '') {

                let elemMBOM = elemItem.closest('#mbom');

                if(elemMBOM.length === 1) {
                    // selectAdjacentMBOMModels(elemItem);
                    viewerSelectModel(partNumber, false);
                } else {
                    viewerSelectModel(partNumber, true);

                }


            }
            insertItemDetails(link);
            insertAttachments(link, 'attachments');
            setBOMPanels(link);
        }

    }

    // Set instructions in viewer markup
    $('#my-markup-button').removeClass('highlight');
    $('#viewer-note').val('');
    $('#viewer-note').attr('data-link', link);

    for(instruction of instructions) {
        if(instruction.link === link) {
            if(instruction.note !== '') {
                $('#viewer-note').val(instruction.note);
                $('#viewer-note').attr('data-part-number', partNumber);
                $('#my-markup-button').addClass('highlight');
                restoreMarkupSVG = instruction.svg;
                restoreMarkupState = instruction.state;
            }
        }
    }
    
}
function selectAdjacentMBOMModels(elemItem) {

    // let elemMBOM = elemItem.closest('#mbom');

    // if(elemMBOM.length === 0) return;

    let elemPrev = elemItem.prev();
    // let elemNext = elemItem.next();

    if(elemPrev.length === 0) {
        let elemParent = elemItem.parent().parent();
        elemPrev = elemParent.prev();
    } else if(elemPrev.attr('data-part-number') === '') {
        let elemPrevBOM = elemPrev.children('.item-bom');
        if(elemPrevBOM.length > 0) {
            elemPrev = elemPrevBOM.children().last();
        }
    }
    if(elemPrev.length > 0) {
        let prevPartNumber = elemPrev.attr('data-part-number');
        viewerSetColor(prevPartNumber, new THREE.Vector4(1, 0.5, 0, 0.5));
    }

    // if(elemNext.length > 0) {
    //     let nextPartNumber = elemNext.attr('data-part-number');
    //     viewerSetColor(nextPartNumber, new THREE.Vector4(0, 1, 0, 0.5));
    // }

}
function deselectItem(elemClicked) {

    $('body').removeClass('bom-panel-on');
    $('.item').removeClass('selected');
    $('.item').removeClass('filter');
    $('.item').show();

    insertItemDetails($('#main').attr('data-link'));

    let elemMBOM = elemClicked.closest('#mbom');

    if(elemMBOM.length === 1) {
        viewerResetSelection(false);
    } else {
        viewerResetSelection(true);
    }

    setStatusBar();
    setStatusBarFilter();

}
function unhideParent(elemVisible) {
    
    let parent = elemVisible.closest('.item');
    
    if(parent.length > 0) {
        parent.show();
//        parent.closest('.item');
        unhideParent(parent.parent());
    }
    
}



// BOM Panels with total quantities
function setBOMPanels(link) {

    $('body').addClass('bom-panel-on');

    let qtyEBOM = 0;
    let qtyMBOM = 0;

    $('#ebom').find('.item').each(function() {
        if($(this).attr('data-link') === link) {
            qtyEBOM = Number($(this).attr('data-total-qty'));
            $('#ebom-total-qty').html(qtyEBOM);
        }
    });

    $('#mbom').find('.item').each(function() {
        if($(this).attr('data-link') === link) {
            qtyMBOM += Number($(this).find('.item-qty-input').val());
        }
    });

    $('#mbom-total-qty').html(qtyMBOM + ' (' + (qtyMBOM-qtyEBOM) + ')');

}


// Drag & Drop functions
function moveItemQuantity() {
    
    let elemItem    = $('.to-move');
    let elemBOM     = $('.selected-target').children('.item-bom');
    let exists      = itemExistsInBOM(elemItem, elemBOM);
    let qtyMove     = $('#copy-qty').val();
    let qtyNew      = elemItem.find('.item-qty-input').val() - $('#copy-qty').val();
    let elemClone   = getItemClone(elemItem);

    if(!exists) {

        elemClone.appendTo(elemBOM);
        elemClone.attr('data-qty', qtyMove);
        elemClone.attr('data-instance-qty', qtyMove);
        elemClone.find('.item-qty-input').val(qtyMove);
    }

    if(qtyNew < 1) {
        elemItem.remove();
    } else {
        elemItem.find('.item-qty-input').val(qtyNew);
    }

    $('#copy-cancel').click();
    setStatusBar();

}
function addItemQuantity() {
    
    let elemItem    = $('.to-move');
    let elemBOM     = $('.selected-target').children('.item-bom');
    let exists      = itemExistsInBOM(elemItem, elemBOM);
    let qtyAdd      = $('#copy-qty').val();
    let elemClone   = getItemClone(elemItem);

    if(!exists) {
        elemClone.appendTo(elemBOM);
        elemClone.attr('data-qty', qtyAdd);
        elemClone.attr('data-instance-qty', qtyAdd);
        elemClone.find('.item-qty-input').val(qtyAdd);
    }

    $('#copy-cancel').click();
    setStatusBar();

}
function itemExistsInBOM(elemItem, elemBOM) {
    
    let exists = false;
    
    elemBOM.children().each(function() {
        if($(this).attr('data-urn') === elemItem.attr('data-urn')) {
        
            let qtyNew = $(this).find('.item-qty').val();
            let qtyAdd  = $('#copy-qty').val();
            qtyNew  = parseInt(qtyAdd) + parseInt(qtyNew);
            
            $(this).find('.item-qty').val(qtyNew);
            
            exists = true;
            
        } 
    });

    return exists;
    
}
function getItemClone(elemItem) {

    let elemClone       = elemItem.clone();
    let elemQtyInput    = elemClone.find('.item-qty-input');
    let elemActions     = elemClone.find('.item-actions');
            
    insertMBOMSelectEvent(elemClone)
    insertMBOMQtyInputControls(elemQtyInput)
    insertMBOMActions(elemActions);

   return elemClone;

}


// Add Items Tab
function insertSearchFilters() {

    if(typeof config.mbom.searches === 'undefined') return;

    let index = 0;

    for(view of config.mbom.searches) {

        index++;

        let elemSearchNav = $('<div></div>');
            elemSearchNav.addClass('blank');
            elemSearchNav.addClass('panel-nav');
            elemSearchNav.addClass('saved-search');
            elemSearchNav.html(view.title);
            elemSearchNav.attr('data-id', 'saved-search-' + index);
            elemSearchNav.attr('data-wsid', view.wsId);
            elemSearchNav.attr('data-query', view.query);
            elemSearchNav.insertAfter($('#nav-search-items'));

        let elemSearchPanel = $('<div></div>');
            elemSearchPanel.attr('id', 'saved-search-' + index);
            elemSearchPanel.appendTo($('#add-views'));

        let elemSearchToolbar = $('<div></div>');
            elemSearchToolbar.addClass('panel-list-toolbar');
            elemSearchToolbar.append('<span>Filter List:</span>');
            elemSearchToolbar.append('<input class="list-filter">');
            elemSearchToolbar.append('<i class="icon">filter_list</i>');
            elemSearchToolbar.appendTo(elemSearchPanel);

        let elemSearchList = $('<div></div>');
            elemSearchList.addClass('panel-list');
            elemSearchList.attr('id', 'saved-search-' + index + '-list');
            elemSearchList.appendTo(elemSearchPanel);

    }

}
function clickPanelNav(elemClicked) {

    let update = (elemClicked.hasClass('selected')) ? true : elemClicked.hasClass('blank');

    $('.panel-nav').removeClass('selected');
    elemClicked.addClass('selected').removeClass('blank');
    
    let id = elemClicked.attr('data-id');
    let elemNew = $('#' + id);
        elemNew.show();
        elemNew.siblings().hide();

    if(elemClicked.hasClass('saved-search')) {
        if(update) {
            searchItems(id, id + '-list', elemClicked.attr('data-query'));
        } else {
            $('#' + id).show().siblings().hide();
        }
    } else  if(id === 'search-items') {
        $('#' + id).show().siblings().hide();
    } else  if(id === 'create-item') {
        $('#create-item').show().siblings().hide();
    } else if(update) {

        $('#add-processing').show();

        switch(id) {

            case 'workspace-views-mbom' : setWorkspaceView('mbom'); break;
            case 'workspace-views-ebom' : setWorkspaceView('ebom'); break;
            case 'bookmark-items'       : setBookmarkItemsList(); break;
            case 'recent-items'         : setRecentItemsList(); break;

        }

    }

}
function searchItems(idView, idList, query) {

    $('#' + idList).html('');
    $('#add-processing').show();

    if(query === $('.panel-nav.active').first().attr('data-query') ) {
        if($('#' + idList).children().length > 0) {
            $('#' + idList).parent().show().siblings().hide();
            return;
        }
    }

    let params = { 
        'wsId'   : wsMBOM.wsId,
        'limit'  : 50,
        'offset' : 0,
        'query'  : query,
        'bulk'   : false
    }

    $.get('/plm/search-bulk', params, function(response) {
        setItemsList(idView, idList, response.data.items);
    });

}
function setWorkspaceView(suffix) {

    $('#workspace-views-' + suffix).show();
    $('#add-processing').show();

    if(($('#workspace-views-' + suffix).attr('data-link') === '') || ($('#workspace-views-' + suffix).attr('data-link') !== $('#view-selector-' + suffix).val())) {

        let elemParent = $('#workspace-view-list-' + suffix);
            elemParent.html('');

        $.get('/plm//tableau-data', { 'link' : $('#view-selector-' + suffix).val() }, function(response) {
        
            console.log(response);

            $('#add-processing').hide();
            for(item of response.data) {
                addItemListEntry(item.item.link, item.item.urn, item.fields[0].value, suffix, elemParent, false);
            }

        });

    } else {
        $('#add-processing').hide();
    }

    $('#workspace-views-' + suffix).attr('data-link', $('#view-selector-' + suffix).val());

}
function setBookmarkItemsList() {

    $('#bookmark-items-list').html('');

    $.get('/plm/bookmarks', {}, function(response) {
        setItemsList('bookmark-items', 'bookmark-items-list', response.data.bookmarks);
    });

}
function setRecentItemsList() {

    $('#recent-items-list').html('');

    $.get('/plm/recent', {}, function(response) {
        setItemsList('recent-items', 'recent-items-list', response.data.recentlyViewedItems);
    });

}
function setItemsList(idView, idList, list) {

    $('#add-processing').hide();

    let elemList = $('#' + idList);
        elemList.html('');

    for(item of list) {

        let link      = item.hasOwnProperty('item') ? item.item.link  : item.__self__;
        let urn       = item.hasOwnProperty('item') ? item.item.urn   : item.urn;
        let title     = item.hasOwnProperty('item') ? item.item.title : item.title;
        let className = getIconClassName(link);

        addItemListEntry(link, urn, title, className, elemList, false);

    }

    let elemSelected = $('.panel-nav.selected');  
    let idSelected = elemSelected.attr('data-id');

    if(idSelected === idView)  $('#' + idView).show().siblings().hide();

}
function addItemListEntry(link, urn, title, className, elemParent, isProcess) {

    let elemItem = $('<div></div>');
        elemItem.addClass('additional-item');
        elemItem.addClass(className);
        elemItem.attr('data-link', link);
        elemItem.attr('data-urn', urn);
        elemItem.html(title);
        elemItem.appendTo(elemParent);
        elemItem.click(function() {
            insertItemDetails($(this).attr('data-link'));
            $(this).addClass('selected');
            $(this).siblings().removeClass('selected');
        })
        elemItem.draggable({ 
            scroll      : false,
            // appendTo : 'body',
            // containment : '#main',
            // containment : 'html',
            appendTo    : 'body',
            containment : 'window',
            cursor      : 'move',
            cursorAt    : { left : 50 },
            helper      : 'clone',
            opacity     : 0.4,
            zIndex      : 100000
        });

    if(isProcess) elemItem.addClass('is-operation');

}
function insertAdditionalItem(elemHead, title, urn, link) {
      
    let qty         = '1';
    let elemBOM     = elemHead.next();
    let className   = getIconClassName(link);
    
    let elemNode = $('<div></div>');
        elemNode.addClass('item');
        elemNode.addClass('leaf');
        elemNode.addClass('unique');
        elemNode.addClass('mbom-item');
        elemNode.addClass(className);
        elemNode.attr('data-urn', urn);
        elemNode.attr('data-link', link);
        elemNode.appendTo(elemBOM);
        
    let elemNodeHead = $('<div></div>');
        elemNodeHead.addClass('item-head');
        elemNodeHead.appendTo(elemNode);
    
    let elemNodeToggle = $('<div></div>');
        elemNodeToggle.addClass('item-toggle');
        elemNodeToggle.appendTo(elemNodeHead);
    
    let elemNodeIcon = $('<div></div>');
        elemNodeIcon.addClass('item-icon');
        elemNodeIcon.html('<span class="icon"></span>');
        elemNodeIcon.appendTo(elemNodeHead);
    
    let elemNodeTitle = $('<div></div>');
        elemNodeTitle.addClass('item-title');
        elemNodeTitle.html(title);
        elemNodeTitle.attr('data-urn', '');
        elemNodeTitle.appendTo(elemNodeHead);

    let elemNodeCode = $('<div></div>');
        elemNodeCode.addClass('item-code');
//        elemNodeCode.html(code);
        elemNodeCode.appendTo(elemNodeHead);
    
    let elemNodeQty = $('<div></div>');
        elemNodeQty.addClass('item-qty');
        elemNodeQty.appendTo(elemNodeHead);
//        elemNodeQty.html(qty);

    let elemQtyInput = $('<input></input>');
        elemQtyInput.attr('type', 'number');
        elemQtyInput.addClass('item-qty-input');
        elemQtyInput.val(qty);
        elemQtyInput.appendTo(elemNodeQty);
    
    let elemNodeStatus = $('<div></div>');
        elemNodeStatus.addClass('item-status');
        elemNodeStatus.appendTo(elemNodeHead);
    
    
    let elemNodeActions = $('<div></div>');
        elemNodeActions.addClass('item-actions');
        elemNodeActions.appendTo(elemNodeHead);    
    
    elemNodeHead.attr('data-qty', qty);
    elemNodeTitle.attr('data-qty', qty);
    elemNode.attr('data-qty', qty);
    
    insertMBOMActions(elemNodeActions);
        
}
function getIconClassName(link, isProcess, isEBOMItem) {

    let className = 'deployed_code';

    if(!singleWorkspace) {
        let id = link.split('/')[4];
        className = (id == wsEBOM.wsId) ? 'ebom ': 'mbom';
    } else {
        if(!isBlank(isProcess)) {
            if(isProcess) return 'radio_button_unchecked';
            else if(!isBlank(isEBOMItem)) {
                if(!isEBOMItem) return 'factory';
            }
        }
    }

    return className;

}
function createItem(type) {

    $('#add-processing').show();
    $('#create-item').hide();

    let params = { 
        'wsId'     : wsMBOM.wsId,
        'sections' : getSectionsPayload($('#create-item-sections')) 
    }

    let isProcess = (type === 'operation');

    $.post({
        url         : '/plm/create', 
        contentType : "application/json",
        data        : JSON.stringify(params)
    }, function(response) {
        
        $('#add-processing').hide();
        $('#create-item').show();
        
        if(response.error) {
            showErrorMessage(' ERROR when creating item');
        } else {
            $.get('/plm/details', { 'link' : response.data.split('.autodeskplm360.net')[1] }, function(response) {
                addItemListEntry(response.params.link, response.data.urn, response.data.title, 'mbom', $('#create-item-list'), isProcess );
            });
        }

    });

}



// Forge Viewer interaction
function onViewerSelectionChanged(event) {

    if(disableViewerSelectionEvent) return;

    if (event.dbIdArray.length === 1) {

        let updateBOMPanels = true;

        viewer.getProperties(event.dbIdArray[0], function(data) {

            let partNumber = data.name.split(':')[0];
            let propertyMatch = false;

            for(partNumberProperty of config.viewer.partNumberProperties) {
                for(property of data.properties) {
                    if(property.displayName === partNumberProperty) {
                        partNumber = property.displayValue;
                        if(partNumber.indexOf(':') > -1) { partNumber = partNumber.split(':')[0]; }
                        propertyMatch = true;
                        break;
                    }
                }
                if(propertyMatch) break;
            }

            if(disassembleMode) {

                if(event.mouseButton === 0) {
                    $('#ebom').find('.item.leaf').each(function() {
                        let elemEBOM = $(this);
                        if(elemEBOM.attr('data-part-number') === partNumber) {
                            let elemActionAdd = elemEBOM.find('.item-action-add').first();
                            elemActionAdd.click();
                            
                        }
                    });
                    viewerHideModel(partNumber);
                }
            } else {

                $('.item.leaf').hide();
                $('.item.leaf').removeClass('selected');
                $('.item.leaf').each(function() {
                    if($(this).attr('data-part-number') === partNumber) { 
                        $(this).show(); 
                        $(this).addClass('selected'); 
                        $(this).parents().show(); 
                        if(updateBOMPanels) {
                            setBOMPanels($(this).attr('data-link'));
                            updateBOMPanels = false;
                        }
                    }
                });

            }

        });

    } else {

        $('.item.leaf').show();
        $('.item.selected').removeClass('selected');
        $('body').removeClass('bom-panel-on');
        
       viewer.clearThemingColors();

    }

}
function initViewerDone() {
    
    viewerStarted = true;

    viewerAddNoteControls();
    viewerAddMarkupControls();   
    // viewerAddGhostingToggle();
    // viewerAddResetButton();
    viewerAddViewsToolbar();

}
function closedViewerMarkup(markupSVG, markupState) {

    console.log("closedViewerMarkup");

    let note        = $('#viewer-note').val();
    let link        = $('#viewer-note').attr('data-link');
    let partNumber  = $('#viewer-note').attr('data-part-number');

    let add = true;

    console.log(note);
    console.log(markupSVG);
    console.log(markupState);

    for(instruction of instructions) {
        if(instruction.link === link) {
            instruction.note = note;
            instruction.svg = markupSVG;
            instruction.state = markupState;
            instruction.changed = true;
            add = false;
        }
    }
    console.log(add);

    if(add) {
        instructions.push({
            'partNumber' : partNumber,
            'link'       : link,
            'edge'       : '',
            'note'       : note,
            'svg'        : markupSVG,
            'state'      : markupState,
            'changed'    : true
        });
    }

    console.log(instructions);

    if(note !== '') $('#my-markup-button').addClass('highlight');

}
function updateViewer() {

    // console.log('updateViewer START');

    var elemButtonView = $('.button-view.selected');

    console.log(elemButtonView.length);

    if(elemButtonView.length > 0) {
        if(!disassembleMode) {
            viewerHideInvisibleItems(elemButtonView.closest('.item'));
        }
    }

}
function viewerHideInvisibleItems(elemStart) {

    let partNumbers     = [];
    let elemParent      = elemStart.parent().parent();
    let partsColored    = null;

    $('#mbom-root-bom').find('.item').addClass('invisible');

    addPartNumber(partNumbers, null, elemStart, false);

    elemStart.prevAll().each(function() {
        addPartNumber(partNumbers, null, $(this), true);
    });

    if(elemParent.length > 0) {
        elemParent.addClass('visible').removeClass('invisible');
        elemParent.prevAll().each(function() {
            addPartNumber(partNumbers, partsColored, $(this), true);
        });
    }

    viewer.setGhosting(false);
    viewer.hideAll();
    viewerUnhideModels(partNumbers);

}
function addPartNumber(partNumbers, partsColored, elemItem, expand) {

    let result     = [];
    let partNumber = elemItem.attr('data-part-number');

    if(partNumber !== '') {
        partNumbers.push(partNumber);
        if(partsColored !== null) {
            partsColored.push(partNumber);
        }
    }

    if(expand) {
        $(elemItem).find('.item').each(function() {
            addPartNumber(partNumbers, partsColored, $(this), true);
        });
    }

    elemItem.addClass('visible').removeClass('invisible');

    return result;

}
function restoreAssembly() {

    if(!disassembleMode) return;

    viewer.showAll();
    let partNumbers = [];

    $('#mbom').find('.item').each(function() {
        let partNumber = $(this).attr('data-part-number');
        if(partNumber !== '') partNumbers.push(partNumber);
    });
    
    viewerHideModels(partNumbers);

}



// Filtering by Status Bar
function setStatusBarFilter() {
    
    $('.item.leaf').show();

    let elemSelected = $('.bar.selected');
    
    if(elemSelected.length === 0) return;

    let dbIds = [];  
    let selectedFilter = elemSelected.attr('data-filter');

    $('.item.leaf').each(function() {
        if(!$(this).hasClass('item-has-bom')) { 
            if(!$(this).hasClass(selectedFilter)) $(this).hide(); 
            else dbIds.push($(this).attr('data-part-number'));
        }
    });

    viewerResetSelection();
    viewerSelectModels(dbIds);
    
}



// Apply changes to database when clicking Save
function setSaveActions() {

    pendingActions   = [0, 0, 0, 0];
    pendingRemovals  = [];

    $('.pending-creation').removeClass('pending-creation');
    $('.pending-addition').removeClass('pending-addition');
    $('.pending-update'  ).removeClass('pending-update'  );

    // Determine and flag new items
    $('#mbom').find('.item').each(function() {
        if((typeof $(this).attr('data-link') === 'undefined') || ($(this).attr('data-link') === '')) {
            $(this).addClass('pending-creation');
        }
    });

    // Determine bom relationships to remove, add or update
    $('#mbom .item-bom').each(function() {

        let elemBOM     = $(this);
        let elemParent  = elemBOM.parent();
        let listEdges   = elemParent.attr('data-edges');
        let linkItem    = elemParent.attr('data-link').split('/');
        let edges       = [];
        let number      = 1;

        if((typeof listEdges !== 'undefined') && (listEdges !== '')){

            edges = listEdges.split(',');
                
            for(edge of edges) {
    
                let keep  = false;
                
                elemBOM.children('.item').each(function()  {
                    if($(this).attr('data-edge') === edge) {
                        keep = true;
                    }
                });
                            
                if(!keep) {
                    pendingRemovals.push({
                        'wsId'      : linkItem[4],
                        'dmsId'     : linkItem[6],
                        'edgeId'    : edge
                    });
                }

            }

        }

        elemBOM.children('.item').each(function()  {
            let elemItem = $(this);
                elemItem.attr('data-number', number++);
            let edge = elemItem.attr('data-edge');
            if(typeof edge === 'undefined') edge = '';
            if(edges.indexOf($(this).attr('data-edge')) < 0) {
                $(this).addClass('pending-addition');
            } else {

                let dbNumber     = elemItem.attr('data-number-db');
                let edNumber     = elemItem.attr('data-number');
                let dbQty        = elemItem.attr('data-qty');
                let edQty        = elemItem.find('.item-qty-input').first().val();

                // console.log(dbQty + ' / ' + edQty);

                if(dbQty !== edQty) elemItem.addClass('pending-update');
                else if(dbNumber !== edNumber) elemItem.addClass('pending-update');

            }           

            for(instruction of instructions) {
                if(instruction.link === elemItem.attr('data-link')) {
                    if(instruction.changed) elemItem.addClass('pending-update');
                }
            }

        });

    });

    pendingActions[0] = $('.pending-creation').length;
    pendingActions[1] = pendingRemovals.length;
    pendingActions[2] = $('.pending-addition').length;
    pendingActions[3] = $('.pending-update').length;

}
function showSaveProcessingDialog() {
   
    $('.step-bar').addClass('transition-stopper')
    $('.step-bar').css('width', '0%');
    $('#overlay').show();
    $('#confirm-saving').addClass('disabled').removeClass('default');
    $('.in-work').removeClass('in-work');
    $('#step1').addClass('in-work');
    $('.step-bar').removeClass('transition-stopper');
    
    $('#step-counter1').html('0 of ' + pendingActions[0]);
    $('#step-counter2').html('0 of ' + pendingActions[1]);
    $('#step-counter3').html('0 of ' + pendingActions[2]);
    $('#step-counter4').html('0 of ' + pendingActions[3]);
    
    $('#dialog-saving').show();

}
function createNewItems() {
    
    let pending = $('.pending-creation').length;
    let progress = (pendingActions[0] - pending) * 100 / pendingActions[0];

    $('#step-bar1').css('width', progress + '%');
    $('#step-counter1').html((pendingActions[0] - pending) + ' of ' + pendingActions[0]);

    if(pending > 0) {
        
        let requests = [];
        let elements = [];

        $('.pending-creation').each(function() {

            if(requests.length < maxRequests) {

                let elemItem = $(this);
                let title    = elemItem.find('.item-descriptor').html();
                let code     = elemItem.find('.item-code').html();
                
                if(elemItem.find('.item-descriptor').length === 0) title = elemItem.find('.item-title').html();

                let params = {
                    'wsId'      : config.mbom.wsIdMBOM,
                    'sections'  : []
                };

                addFieldToPayload(params.sections, wsMBOM.sections, null, config.mbom.fieldIdTitle, title);
                addFieldToPayload(params.sections, wsMBOM.sections, null, config.mbom.fieldIdIsProcess, true);
                addFieldToPayload(params.sections, wsMBOM.sections, null, config.mbom.fieldIdProcessCode, code);

                console.log(params);

                if(!isBlank(config.mbom.fieldIdNumber)) {
                    if(!isBlank(config.mbom.incrementOperatonsItemNumber)) {
                        if(code !== '') {
                          addFieldToPayload(params.sections, wsMBOM.sections, null, config.mbom.fieldIdNumber, basePartNumber + '-' + code);
                        }
                    }
                }

                for(newDefault of config.mbom.newDefaults) {
                    addFieldToPayload(params.sections, wsMBOM.sections, null, newDefault[0], newDefault[1]);
                }

                requests.push($.post('/plm/create', params));
                elements.push(elemItem);

            }

        });

        Promise.all(requests).then(function(responses) {

            requests = [];

            for(response of responses) {
                requests.push($.get('/plm/descriptor', {
                    'link' : response.data.split('.autodeskplm360.net')[1]
                }));
            }

            Promise.all(requests).then(function(responses) {

                let index = 0;

                for(response of responses) {

                    let elemItem = elements[index++];
                        elemItem.attr('data-link', response.params.link);
                        elemItem.attr('root-link', response.params.link);
                        elemItem.removeClass('pending-creation');

                    let elemHead = elemItem.children().first();
                        elemHead.find('.item-descriptor').html(response.data);    
                    
                    if(elemHead.find('.item-descriptor').length === 0) elemHead.find('.item-title').html(response.data);

                }

                createNewItems(); 

            });

        });
     
    } else { 

        $('#step-bar1').css('width', '100%');
        $('#step1').removeClass('in-work');
        $('#step2').addClass('in-work');
        $('#step-counter1').html(pendingActions[0] + ' of ' + pendingActions[0]);

        deleteBOMItems(); 
        
    }
    
}
function deleteBOMItems() {

    let pending  = pendingRemovals.length;
    let progress = (pendingActions[1] - pending) * 100 / pendingActions[1];

    $('#step-bar2').css('width', progress + '%');
    $('#step-counter2').html((pendingActions[1] - pending) + ' of ' + pendingActions[1]);

    if(pending > 0) {
        
        let requests = [];
        let index    = (maxRequests < pendingRemovals.length) ? maxRequests : pendingRemovals.length;
            index--;

        for(index; index >= 0; index--) {

            requests.push($.get('/plm/bom-remove', pendingRemovals[index]));
            pendingRemovals.splice(index,1);

        }

        Promise.all(requests).then(function(responses) {
        
            for(response of responses) {

                if(response.error === false) {

                    let edgeId = response.params.edgeId;

                    $('.item').each(function() {
                        let elemItem = $(this);
                        let edgesData = elemItem.attr('data-edges');
                        if(typeof(edgesData) !== 'undefined') {
                            if(edgesData !== '') {
                                let edges = edgesData.split(',');
                                if(edges.indexOf(edgeId) >= 0) {
                                    edges.splice(edges.indexOf(edgeId), 1);
                                    elemItem.attr('data-edges', edges.toString());
                                }
                            }
                        }
                    });

                }

            }

            deleteBOMItems();
        
        });

    } else {

        $('#step-bar2').css('width', '100%');
        $('#step2').removeClass('in-work');
        $('#step3').addClass('in-work');
        $('#step-counter2').html(pendingActions[1] + ' of ' + pendingActions[1]);

        addBOMItems();

    }

}
function addBOMItems() {       
        
    let pending  = $('.pending-addition').length;
    let progress = (pendingActions[2] - pending) * 100 / pendingActions[2];

    $('#step-bar3').css('width', progress + '%');
    $('#step-counter3').html((pendingActions[2] - pending) + ' of ' + pendingActions[2]);

    if(pending > 0) {

        let requests = [];
        let elements = [];

        $('.pending-addition').each(function() {

            if(requests.length < maxRequests) {
            
                let elemItem     = $(this);
                let elemParent   = elemItem.parent().closest('.item');
                let paramsParent = elemParent.attr('data-link').split('/');
                let paramsChild  = elemItem.attr('data-link').split('/');
                let edQty        = elemItem.find('.item-qty-input').first().val();
                let urnMBOM      = elemItem.attr('data-urn-mbom');
                let linkEBOMRoot = elemItem.attr('data-ebom-root');
                let isEBOMItem   = elemItem.hasClass('is-ebom-item');
                
                if (typeof urnMBOM !== 'undefined') {

                    let urn = urnMBOM.split('.');
                    paramsChild[4] = urn[4];
                    paramsChild[6] = urn[5];

                }

                let params = {                    
                    'wsIdParent'    : paramsParent[4],
                    'wsIdChild'     : paramsChild[4],
                    'dmsIdParent'   : paramsParent[6], 
                    'dmsIdChild'    : paramsChild[6],
                    'number'        : elemItem.attr('data-number'),
                    'qty'           : edQty,
                    'pinned'        : config.mbom.pinMBOMItems,
                    'fields'        : []
                };

                if(isEBOMItem) params.fields.push({ 'link' : linkFieldEBOMItem, 'value' : true });
                if(!isBlank(linkEBOMRoot)) params.fields.push({ 'link' : linkFieldEBOMRootItem, 'value' : linkEBOMRoot });

                requests.push($.get('/plm/bom-add', params));
                elements.push(elemItem);

                console.log(params);

            }

        });

        Promise.all(requests).then(function(responses) {
        
            requests = [];

            for(response of responses) {
                requests.push($.get('/plm/bom-item', { 'link' : response.data }));
            }

            Promise.all(requests).then(function(responses) {

                let index = 0;

                for(response of responses) {

                    let elemItem   = elements[index++];
                    let elemParent = elemItem.parent().closest('.item');
                    let edgeId     = response.data.__self__.split('/')[8];
                    let itemNumber = response.data.itemNumber;

                    elemItem.removeClass('pending-addition');
                    elemItem.attr('data-number-db', itemNumber);
                    elemItem.attr('data-edge', edgeId);

                    // Update edges list of parent item
                    if((typeof elemParent.attr('data-edges') === 'undefined') || (elemParent.attr('data-edges') === '')) {
                        
                        elemParent.attr('data-edges', edgeId);
                        
                    } else {

                        let edges = elemParent.attr('data-edges').split(',');
                            edges.push(edgeId);

                        elemParent.attr('data-edges', edges.toString());
                        
                    }

                }

                addBOMItems();
            });
        
        });

    } else {

        $('#step-bar3').css('width', '100%');
        $('#step3').removeClass('in-work');
        $('#step4').addClass('in-work');
        $('#step-counter3').html(pendingActions[2] + ' of ' + pendingActions[2]);

        updateBOMItems();
    }
    
}
function updateBOMItems() {       
        
    let pending  = $('.pending-update').length;
    let progress = (pendingActions[3] - pending) * 100 / pendingActions[3];

    $('#step-bar4').css('width', progress + '%');
    $('#step-counter4').html((pendingActions[3] - pending) + ' of ' + pendingActions[3]);

    if(pending > 0) {

        let requests = [];
        let elements = [];

        $('.pending-update').each(function() {

            if(requests.length < maxRequests) {

                let elemItem    = $(this);
                let elemParent   = elemItem.parent().closest('.item');
                let edNumber     = elemItem.attr('data-number');
                let paramsChild  = elemItem.attr('data-link').split('/');
                let paramsParent = elemParent.attr('data-link').split('/');
                let urnMBOM      = elemItem.attr('data-urn-mbom');
                let edQty        = elemItem.find('.item-qty-input').first().val();

                if(typeof urnMBOM !== 'undefined') {
                    let data = elemItem.attr('data-urn-mbom').split('.');
                    paramsChild[4] = data[4];
                    paramsChild[6] = data[5];
                }

                let params = {                    
                    'wsIdParent'  : paramsParent[4],
                    'wsIdChild'   : paramsChild[4],
                    'dmsIdParent' : paramsParent[6], 
                    'dmsIdChild'  : paramsChild[6],
                    'edgeId'      : elemItem.attr('data-edge'),
                    'number'      : edNumber,
                    'qty'         : edQty,
                    'pinned'      : config.mbom.pinMBOMItems
                };

                let linkFieldNote   = '';
                let linkFieldSVG    = '';
                let linkFieldState  = '';

                for(column of wsMBOM.viewColumns) {
                         if(column.fieldId === config.mbom.fieldIdInstructions) linkFieldNote  = column.link;
                    else if(column.fieldId === config.mbom.fieldIdMarkupSVG   ) linkFieldSVG   = column.link;
                    else if(column.fieldId === config.mbom.fieldIdMarkupState ) linkFieldState = column.link;
                }

                for(instruction of instructions) {
                    if(instruction.link === elemItem.attr('data-link')) {
                        if(instruction.changed) {
                            params.fields = [
                                { 'link'  : linkFieldNote , 'value' : instruction.note  },
                                { 'link'  : linkFieldSVG  , 'value' : instruction.svg   },
                                { 'link'  : linkFieldState, 'value' : instruction.state }
                            ]
                        }
                    }
                }

                requests.push($.get('/plm/bom-update', params));
                elements.push(elemItem);

            }

        });

        Promise.all(requests).then(function(responses) {

            let index = 0;

            for(response of responses) {

                let elemItem = elements[index++];
                    elemItem.removeClass('pending-update');
                    elemItem.attr('data-number-db', response.params.number);
                    elemItem.attr('data-qty', response.params.qty);
        
            }

            updateBOMItems();

        });

    } else {

        $('#step-bar4').css('width', '100%');
        $('#step4').removeClass('in-work');
        $('#step-counter4').html(pendingActions[3] + ' of ' + pendingActions[3]);

        endProcessing();

    }
    
}
function endProcessing() {

    $('#confirm-saving').removeClass('disabled').addClass('default');
    $('.in-work').removeClass('in-work');

    let timestamp  = new Date();
    let value      = timestamp.getFullYear() + '-' + (timestamp.getMonth()+1) + '-' + timestamp.getDate();
    let paramsEBOM = { 'link' : linkEBOM, 'sections'   : [] }
    let paramsMBOM = { 'link' : linkMBOM, 'sections'   : [] }

    addFieldToPayload(paramsEBOM.sections, wsEBOM.sections, null, config.mbom.fieldIdLastSync, value);
    addFieldToPayload(paramsEBOM.sections, wsEBOM.sections, null, config.mbom.fieldIdLastUser + siteSuffix, $('#header-avatar').attr('title'));
    addFieldToPayload(paramsMBOM.sections, wsMBOM.sections, null, config.mbom.fieldIdLastSync, value);

    $.get('/plm/edit', paramsEBOM, function(response) {});
    $.get('/plm/edit', paramsMBOM, function(response) {});

}