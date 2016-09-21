$(document).ready(function() {
    if(initDataManager !== true || $('#catalog').length < 1) {
        return;
    }
    
    var dataManager = new GCDataManager($('#catalog').val());
    dataManager.checkAvailableImports();
    
    $('a[data-action="data_manager"]').show().click(function(event) {
        event.preventDefault();
        
        $('div#import_dialog').dialog('open');
        $('div#import_dialog table[data-role="columns"] td').parent().remove();
    });
    
    $('div#import_dialog div#import_dialog_tabs').tabs({
        select: function(event, ui) {
            dataManager.fileTypeSelected(ui.index);
        }
    });
    
    $('div#import_dialog').dialog({
        title: 'Import Data',
        width: 1000,
        height: 600,
        autoOpen: false,
        open: function() {
            $('div#import_dialog div#import_dialog_tabs').tabs('select', 0);
            dataManager.getFileList();
        }
    });

    var shpUploader = uploader({
        dataUrl: 'action=upload-shp',
        validation: function (file) {
            if (/.+\.(shp|shx|dbf)$/.test(file.name)) {
                return file;
            }
            return false;
        },
        progressBar: document.getElementById('progress_shp'),
        onAllComplete: function () {
            dataManager.getFileList();
        },
        
    });
    var shpHandler = fileHandler(shpUploader);
    shpHandler.input('shp_file_upload');

    var xlsUploader = uploader({
        dataUrl: 'action=upload-xls',
        validation: function (file) {
            if (/.+\.xlsx?$/.test(file.name)) {
                return file;
            }
            return false;
        },
        progressBar: document.getElementById('progress_xls'),
        onAllComplete: function () {
            dataManager.getFileList();
        },
    });
    var xlsHandler = fileHandler(xlsUploader);
    xlsHandler.input('xls_file_upload');
    
    var csvUploader = uploader({
        dataUrl: 'action=upload-csv',
        validation: function (file) {
            if (/.+\.csv$/.test(file.name)) {
                return file;
            }
            return false;
        },
        progressBar: document.getElementById('progress_csv'),
        onAllComplete: function () {
            dataManager.getFileList();
        },
    });
    var csvHandler = fileHandler(csvUploader);
    csvHandler.input('csv_file_upload');

    var docUploader = uploader({
        dataUrl: 'action=upload-doc&parent_id=' + $('div#import_dialog input[name=current_id]').val(),
        progressBar: document.getElementById('progress_doc'),
        validationPromise: function (file, successPromise) {
            var parent_id = $('div#import_dialog input[name=current_id]').val();
            docUploader.setDataUrl('action=upload-doc&parent_id=' + $('div#import_dialog input[name=current_id]').val());

            dataManager.ajaxRequest({
                data: {action: 'check-virtual-name', name: file.name, parent_id: parent_id},
                success: function(response) {
                    if(typeof(response) != 'object' || response === null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                        self.showErrorReponseAlert(response);
                        return;
                    }

                    if (response.isValidName) {
                        successPromise(file);
                    }
                }
            });

            return function() {

            };
        },
        onAllComplete: function () {
            dataManager.getFsList($('div#import_dialog input[name=current_id]').val());
        },
    });
    var docHandler = fileHandler(docUploader);
    docHandler.input('doc_file_upload');
    docHandler.dragAndDrop('fs_list');

    var rasterUploader = uploader({
        dataUrl: 'action=upload-raster&catalog_id=' + $('#catalog').val(),
        validation: function (file) {
            var directory = $('div#import_dialog input[name="dir_name"]').val();
            if(directory === '') {
                alert('Empty directory');
                return false;
            } else {
                rasterUploader.setDataUrl('action=upload-raster&catalog_id=' + $('#catalog').val() + '&directory=' + directory);
            }

            if (/.+\.(tif|tiff|tfw|ecw|jpg|jpeg|jgw|png|pgw|gif|gfw)$/.test(file.name)) {
                return file;
            }
            return false;
        },
        progressBar: document.getElementById('progress_raster'),
        onAllComplete: function () {
            dataManager.getFileList();
        },
    });
    var rasterHandler = fileHandler(rasterUploader);
    rasterHandler.input('raster_file_upload');

    $('div#import_dialog input[name="dir_name"]').change(function (event) {
        $('#raster_file_upload').prop( "disabled", !event.target.value);
    }).change();

    $('div#import_dialog input[name=doc_folder_name]').keyup(function(event){
        var self = dataManager;
        var folder_name = event.target.value;
        var parent_id = $('div#import_dialog input[name=current_id]').val();
        if (!!folder_name) {
            self.ajaxRequest({
                data: {action: 'check-virtual-name', name: folder_name, parent_id: parent_id},
                success: function(response) {
                    if(typeof(response) != 'object' || response === null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                        self.showErrorReponseAlert(response);
                        return;
                    }

                    $('div#import_dialog button[name="create_folder"]').button("option", "disabled", !response.isValidName);
                }
            });
        } else {
            $('div#import_dialog button[name="create_folder"]').button("option", "disabled", true);
        }
    }).keyup();
    
    $('div#import_dialog div#import_dialog_shp button[name="import"]').button().hide().click(function(event) {
        event.preventDefault();
        dataManager.importShp();
    });
    $('div#import_dialog div#import_dialog_xls button[name="import"]').button().hide().click(function(event) {
        event.preventDefault();
        dataManager.importXls();
    });
    $('div#import_dialog button[name="tileindex"]').button().hide().click(function(event) {
        event.preventDefault();
        dataManager.createTileindex();
        dataManager.createPyramidRaster();
    });
    
    var fieldTypeOptions = '';
    $.each(dataManager.columnTypes, function(dbType, type) {
        fieldTypeOptions += '<option value="'+dbType+'">'+type+'</option>';
    });
    
    $('div#import_dialog a[data-action="add_column"]').click(function(event) {
        event.preventDefault();
        
        var numColumns = $('div#import_dialog input[name="num_columns"]').val();
        var html = '<tr><td><input type="text" name="column_name_'+numColumns+'"></td><td><select name="column_type_'+numColumns+'">' +
            fieldTypeOptions + '</select></td></tr>';
        $('div#import_dialog table[data-role="columns"]').append(html);
        $('div#import_dialog input[name="num_columns"]').val(parseInt(numColumns)+1);
    });
    
    $('div#add_column_dialog').dialog({
        title: 'Add column',
        width: 500,
        height: 200,
        autoOpen: false
    });
    var html = '<tr><td><input type="text" name="column_name"></td><td><select name="column_type">' +
        fieldTypeOptions + '</select></td></tr>';
    $('div#add_column_dialog table[data-role="columns"]').append(html);
    
    $('div#add_column_dialog button[name="add_column"]').click(function(event) {
        event.preventDefault();
        
        dataManager.addColumn();
    });
    
    $('div#import_dialog button[name="create_table"]').click(function(event) {
        event.preventDefault();
        
        dataManager.createTable();
    });
    $('div#import_dialog input[name$="_insert_method"]').click(function(event) {
        var type = $(this).attr('name').substr(0, 3);
        dataManager.changeImportMethod(type, $(this).val());
    });
    $('div#import_dialog button[name="create_folder"]').click(function(event) {
        event.preventDefault();
        dataManager.createVirtualFolder();
    });
});

function GCDataManager(catalogId) {

    this.catalogId = catalogId;
    this.fileType = 'shp';
    this.tileTypes = {
        0: 'shp',
        1: 'raster',
        2: 'postgis',
        3: 'xls',
        4: 'csv',
        5: 'doc'
    };
    
    this.columnTypes = {
        text: 'Text',
        date: 'Date',
        'double precision': 'Number'
    };
    
    this.showErrorReponseAlert = function(response) {
        if ('error' in response) {
            alert(response.error);
        } else {
            alert('Error');
        }
    };
    
    this.checkAvailableImports = function() {
        var self = this;
        
        $('div#import_dialog div.logs').empty();
        
        self.ajaxRequest({
            data: {action:'get-available-imports'},
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    self.showErrorReponseAlert(response);
                    return;
                }
                
                $.each(self.tileTypes, function(index, name) {
                    if(typeof(response.imports[index]) == 'undefined') {
                        $('div#import_dialog div#import_dialog_tabs').tabs('disable', parseInt(index));
                    }
                });
                
                //self.hasLastEditColumn = !!response.lastEditColumn;
                //self.hasMeasureColumn = !!response.measureColumn;
            }
        });
    };

    this.fileTypeSelected = function(index) {
        var self = this;
        
        switch(index) {
            case 0:
                self.fileType = 'shp';
            break;
            case 1:
                self.fileType = 'raster';
            break;
            case 2:
                self.fileType = 'postgis';
                return self.getTableList();
            break;
            case 3:
                self.fileType = 'xls';
            break;
            case 4:
                self.fileType = 'csv';
            break;
            case 5:
                self.fileType = 'doc';
                return self.getFsList();
            break;
            default:
                alert('file type ' + index + 'Not implemented');
                return;
            break;
        }
        self.getFileList();
    };
    
    this.deleteFile = function(fileName) {
        var self = this;
        
        $('div#import_dialog div.logs').empty();
        
        if(!confirm('Are you sure?')) return;
        
        self.ajaxRequest({
            data: {action:'delete-file', file_name:fileName, file_type:self.fileType},
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    self.showErrorReponseAlert(response);
                    return;
                }
                
                self.getFileList();
            }
        });
    };
    
    this.deleteTable = function(tableName) {
        var self = this;
        
        $('div#import_dialog div.logs').empty();
        
        if(!confirm('Are you sure?')) return;
        
        self.ajaxRequest({
            data: {action:'delete-table', table_name:tableName},
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    self.showErrorReponseAlert(response);
                    return;
                }
                
                self.getTableList();
            }
        });
    };
    
    this.emptyTable = function(tableName) {
        var self = this;
        
        $('div#import_dialog div.logs').empty();
        
        if(!confirm('Are you sure?')) return;
        
        self.ajaxRequest({
            data: {action:'empty-table', table_name:tableName},
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    self.showErrorReponseAlert(response);
                    return;
                }
                
                self.getTableList();
            }
        });
    };  
    
    this.addLastEditColumn = function(tableName) {
        var self = this;
        
        $('div#import_dialog div.logs').empty();
        
        self.ajaxRequest({
            data: {action:'add-last-edit-column', table_name:tableName},
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    self.showErrorReponseAlert(response);
                    return;
                }
                
                self.getTableList();
            }
        });
    };
    
    this.addMeasureColumn = function(tableName) {
        var self = this;
        
        $('div#import_dialog div.logs').empty();
        
        self.ajaxRequest({
            data: {action:'add-measure-column', table_name:tableName},
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    self.showErrorReponseAlert(response);
                    return;
                }
                
                self.getTableList();
            }
        });
    };
    
    this.getTableList = function() {
        var self = this;
        
        $('div#import_dialog div.logs').empty();
        
        self.ajaxRequest({
            data: {action:'get-postgis-tables'},
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    self.showErrorReponseAlert(response);
                }
                
                var html = '<table><tr><th>Tablename</th><th>SRID</th><th>Type</th><th></th></tr>';
                $.each(response.data, function(e, table) {
                    if(typeof(table.type) != 'undefined' && table.type != null) {
                        html += '<tr><td>'+table.name+'</td><td>'+table.srid+'</td><td>'+table.type+' ('+table.dim+'d)</td>'+
                            '<td><a href="#" class="button" data-action="delete" data-table="'+table.name+'">Delete</a>'+
                            '<a href="#" class="button" data-action="empty" data-table="'+table.name+'">Empty</a>'+
                            '<a href="#" class="button" data-action="add_column" data-table="'+table.name+'">Add column</a>'+
                            '<a href="#" class="button" data-action="export_shp" data-table="'+table.name+'">Export SHP</a>';
                        if(!table.has_last_edit_date_column && !table.has_last_edit_date_column) {
                            html += '<a href="#" class="button" data-action="add_lastedit_column" data-table="'+table.name+'">Add Last edit col</a>';
                        }
                        if(!table.has_length_column && !table.has_area_column && !table.has_pointx_column && !table.has_pointy_column) {
                            html += '<a href="#" class="button" data-action="add_measure_column" data-table="'+table.name+'">Add measure col</a>';
                        }
                        html += '</td></tr>';

                    } else {
                        html += '<tr><td>'+table.name+'</td><td></td><td>Alphanumeric</td>'+
                            '<td><a href="#" class="button" data-action="delete" data-table="'+table.name+'">Delete</a>'+
                            '<a href="#" class="button" data-action="empty" data-table="'+table.name+'">Empty</a>'+
                            '<a href="#" class="button" data-action="export_xls" data-table="'+table.name+'">Export XLS</a><a href="#" class="button" data-action="export_csv" data-table="'+table.name+'">CSV</a></td></tr>';
                    }
                });
                html += '</table>';
                $('div#import_dialog div[data-role="table_list"]').empty().html(html);
                
                $('div#import_dialog div[data-role="table_list"] a[data-action="delete"]').button().click(function(event) {
                    event.preventDefault();
                    
                    $('span', $(this)).html('Loading..');
                    var tableName = $(this).attr('data-table');
                    self.deleteTable(tableName);
                });
                $('div#import_dialog div[data-role="table_list"] a[data-action="export_shp"]').button().click(function(event) {
                    event.preventDefault();
                    
                    $('span', $(this)).html('Loading..');
                    var tableName = $(this).attr('data-table');
                    self.exportShp(tableName);
                });
                $('div#import_dialog div[data-role="table_list"] a[data-action="export_xls"]').button().click(function(event) {
                    event.preventDefault();
                    
                    var tableName = $(this).attr('data-table');
                    self.exportXls(tableName);
                });
                $('div#import_dialog div[data-role="table_list"] a[data-action="export_csv"]').button().click(function(event) {
                    event.preventDefault();
                    
                    var tableName = $(this).attr('data-table');
                    self.exportCsv(tableName);
                });
                $('div#import_dialog div[data-role="table_list"] a[data-action="empty"]').button().click(function(event) {
                    event.preventDefault();
                    
                    var tableName = $(this).attr('data-table');
                    self.emptyTable(tableName);
                });
                $('div#import_dialog div[data-role="table_list"] a[data-action="add_column"]').button().click(function(event) {
                    event.preventDefault();
                    
                    var tableName = $(this).attr('data-table');
                    self.showAddColumnDialog(tableName);
                    
                });
                $('div#import_dialog div[data-role="table_list"] a[data-action="add_lastedit_column"]').button().click(function(event) {
                    event.preventDefault();
                    
                    $('span', $(this)).html('Loading..');
                    
                    var tableName = $(this).attr('data-table');
                    self.addLastEditColumn(tableName);
                });
                $('div#import_dialog div[data-role="table_list"] a[data-action="add_measure_column"]').button().click(function(event) {
                    event.preventDefault();
                    
                    $('span', $(this)).html('Loading..');
                    
                    var tableName = $(this).attr('data-table');
                    self.addMeasureColumn(tableName);
                });
            }
        });
    };
    
    this.changeImportMethod = function(type, method) {
        var self = this;
        
        $('div#import_dialog div.logs').empty();
        
        if(method == 'create') {
            $('div#import_dialog input[name="'+type+'_table_name"]').show();
            $('div#import_dialog input[name="'+type+'_srid"]').attr('disabled', false);
            $('div#import_dialog select[name="'+type+'_table_name_select"]').hide();
        } else {
            if($('div#import_dialog select[name="'+type+'_table_name_select"] option').length == 0) {
                self.populateTableListSelect(type);
            }
            $('div#import_dialog input[name="'+type+'_table_name"]').hide();
            $('div#import_dialog input[name="'+type+'_srid"]').attr('disabled', true);
            $('div#import_dialog select[name="'+type+'_table_name_select"]').show();
        }
    };
    
    this.populateTableListSelect = function(type) {
        var self = this;
        
        $('div#import_dialog div.logs').empty();
        
        var params = {
            action: 'get-postgis-tables',
            alhpaOnly: (type == 'xls' || type == 'csv') ? true : false,
            geomOnly: (type == 'shp') ? true : false
        };
        
        self.ajaxRequest({
            data: params,
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    self.showErrorReponseAlert(response);
                }
                
                $('div#import_dialog select[name="'+type+'_table_name_select"]').empty();
                var html = '<option value="" data-srid="" selected>Select</option>';
                $.each(response.data, function(e, table) {
                    html += '<option value="'+table.name+'" data-srid="'+table.srid+'">'+table.name+'</option>';    
                });
                $('div#import_dialog select[name="'+type+'_table_name_select"]').html(html);
                $('div#import_dialog select[name="'+type+'_table_name_select"]').change(function(event) {
                    var srid = $('div#import_dialog select[name="'+type+'_table_name_select"] option:selected').attr('data-srid');
                    $('div#import_dialog input[name="'+type+'_srid"]').val(srid);
                });
            }
        });
    };
    
    /*this.checkUploadFolderName = function(directory) {
        var self = this;
        
        $('div#import_dialog div.logs').empty();
        
        self.ajaxRequest({
            data: {action:'check-upload-folder', directory:directory},
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    self.showErrorReponseAlert(response);
                    return;
                }
                if(response.data != 'ok') {
                    $('div#import_dialog div.logs').html(response.data).focus();
                    return;
                }
            }
        });
    };*/

    this.getFsList = function(folder_id) {
        var self = this;
        
        $('div#import_dialog div.logs').empty();
        
        self.ajaxRequest({
            data: {action:'get-virtual-fs', folder_id: folder_id},
            success: function(response) {
                if(typeof(response) != 'object' || response === null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    self.showErrorReponseAlert(response);
                    return;
                }
                
                var html = '<input type="hidden" name="current_id" value="' + (response.data.id || '') + '">';
                html += '<span><b>PATH:</b>' + response.data.path + '</span>';
                html += '<ul>';
                if (response.data.id !== null) {
                    var parent_id = response.data.parent_id || '';
                    html += '<li><a href="#" data-action="getfs" data-doc_id="' + parent_id + '">..</a></li>';
                }
                $.each(response.data.content, function(e, file) {
                    if (file.doc_type == 'folder') {
                        html += '<li style="clear:both"><span style="float:left">';
                        html += '<a href="#" data-action="getfs" data-doc_id="' + file.doc_id + '">' + file.doc_name + '</a>';
                        html += '</span><span style="float:right">';
                        if (response.data.id !== null) {
                            html += '<a href="#" data-action="delete" data-doc_id="'+file.doc_id+'">Delete</a>';
                        }
                        html += '</span></li>';
                    } else {
                        html += '<li style="clear:both"><span style="float:left">' + file.doc_name + '</span><span style="float:right">';
                        if (file.doc_public === true) {
                            html += '<a href="../services/documents' + file.doc_path + '" target="_blank" data-action="open_link">Open link</a>';
                            html += '<a href="#" data-action="private" data-doc_id="' + file.doc_id + '">Private</a>';
                        } else {
                            html += '<a href="#" data-action="public" data-doc_id="' + file.doc_id + '">Public</a>';
                        }
                        html += '<a href="#" data-action="delete" data-doc_id="' + file.doc_id + '">Delete</a>';
                        html += '</span></li>';
                    }
                });
                html += '</ul><br style="clear:both">';
                $('div#import_dialog div[data-role="fs_list"]').empty().html(html);
                
                $('div#import_dialog div[data-role="fs_list"] a[data-action="getfs"]').button().click(function(event) {
                    event.preventDefault();
                    
                    var next_folder_id = $(this).attr('data-doc_id');
                    self.getFsList(next_folder_id);
                });
                
                $('div#import_dialog div[data-role="fs_list"] a[data-action="delete"]').button().click(function(event) {
                    event.preventDefault();
                    var id = $(this).attr('data-doc_id');
                    
                    self.deleteVirtualFs(id);
                });
                $('div#import_dialog div[data-role="fs_list"] a[data-action="open_link"]').button({icons:{primary:'ui-icon-extlink'}, text:false});
                $('div#import_dialog div[data-role="fs_list"] a[data-action="private"]').button().click(function(event) {
                    event.preventDefault();
                    var id = $(this).attr('data-doc_id');
                    
                    self.setPrivateVirtualFs(id);
                });
                $('div#import_dialog div[data-role="fs_list"] a[data-action="public"]').button().click(function(event) {
                    event.preventDefault();
                    var id = $(this).attr('data-doc_id');
                    
                    self.setPublicVirtualFs(id);
                });

                $('div#import_dialog #doc_file_upload').prop('disabled', response.data.id === null);
                $('div#import_dialog #doc_new_folder').toggle(response.data.id !== null);
                
            }
        });
    };

    this.createVirtualFolder = function() {
        var self = this;
        var folder_name = $('div#import_dialog input[name=doc_folder_name]').val();
        var parent_id = $('div#import_dialog input[name=current_id]').val();
        if (!!folder_name) {
            self.ajaxRequest({
                data: {action: 'create-virtual-folder', folder_name: folder_name, parent_id: parent_id},
                success: function(response) {
                    if(typeof(response) != 'object' || response === null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                        self.showErrorReponseAlert(response);
                        return;
                    }
                    $('div#import_dialog input[name=doc_folder_name]').val('');
                    self.getFsList(response.doc_id);
                }
            });
        }
    };

    this.deleteVirtualFs = function(id) {
        var self = this;
        var r = confirm("ATTENZIONE! Cancellare l'elemento e tutto il suo contenuto?");
        if (r === true) {
            self.ajaxRequest({
                data: {action:'delete-from-virtual-fs', doc_id: id},
                success: function(response) {
                    if(typeof(response) != 'object' || response === null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                        self.showErrorReponseAlert(response);
                        return;
                    }

                    self.getFsList($('div#import_dialog input[name=current_id]').val());
                }
            });
        }
    };

    this.setPublicVirtualFs = function(id) {
        var self = this;
        self.ajaxRequest({
            data: {action:'set-public-virtual-fs', doc_id: id},
            success: function(response) {
                if(typeof(response) != 'object' || response === null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    self.showErrorReponseAlert(response);
                    return;
                }

                self.getFsList($('div#import_dialog input[name=current_id]').val());
            }
        });
    };

    this.setPrivateVirtualFs = function(id) {
        var self = this;
        self.ajaxRequest({
            data: {action:'set-private-virtual-fs', doc_id: id},
            success: function(response) {
                if(typeof(response) != 'object' || response === null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    self.showErrorReponseAlert(response);
                    return;
                }

                self.getFsList($('div#import_dialog input[name=current_id]').val());
            }
        });
    };
    
    this.getFileList = function() {
        var self = this;
        
        $('div#import_dialog div.logs').empty();
        
        self.ajaxRequest({
            data: {action:'get-uploaded-files', file_type:self.fileType},
            success: function(response) {
                if(typeof(response) != 'object' || response === null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    self.showErrorReponseAlert(response);
                    return;
                }
                
                var html = '<ul>';
                $.each(response.data, function(e, file) {
                    html += '<li><a href="#" class="button" data-action="delete" data-file="'+file.file_name+'">Delete</a>';
                    html += '<a href="#" class="button" data-action="select" data-file="'+file.file_name+'">Select</a>';
                    html += file.file_name+'</li>';
                });
                html += '</ul>';
                $('div#import_dialog div[data-role="file_list"]').empty().html(html);
                
                $('div#import_dialog div[data-role="file_list"] a[data-action="select"]').button().click(function(event) {
                    event.preventDefault();
                    
                    var fileName = $(this).attr('data-file');
                    self.selectFile(fileName);
                });
                
                $('div#import_dialog div[data-role="file_list"] a[data-action="delete"]').button().click(function(event) {
                    event.preventDefault();
                    
                    var fileName = $(this).attr('data-file');
                    self.deleteFile(fileName);
                });
                
            }
        });
    };
    
    this.selectFile = function(fileName) {
        var self = this;
        
        switch(self.fileType) {
            case 'shp':
                $('div#import_dialog input[name="shp_file_name"]').val(fileName);
                var fileNameWoExtension = fileName.replace('.shp', '');
                $('div#import_dialog input[name="shp_table_name"]').val(fileNameWoExtension);
                $('div#import_dialog button[name="import"]').show();
            break;
            case 'raster':
                $('div#import_dialog input[name="raster_file_name"]').val(fileName);
                $('div#import_dialog input[name="raster_table_name"]').val('tile_'+fileName);
                $('div#import_dialog button[name="tileindex"]').show();
            break;
            case 'xls':
                var replace;
                $('div#import_dialog input[name="xls_file_name"]').val(fileName);
                if(fileName.substr(-4) == 'xlsx') replace = '.xlsx';
                else if(fileName.substr(-4) == '.xls') replace = '.xls';
                else return alert('Invalid filename');
                var fileNameWoExtension = fileName.replace(replace, '');
                $('div#import_dialog input[name="xls_table_name"]').val(fileNameWoExtension);
                $('div#import_dialog button[name="import"]').show();
            break;
            case 'csv':
                $('div#import_dialog input[name="csv_file_name"]').val(fileName);
                var fileNameWoExtension = fileName.replace('.csv', '');
                $('div#import_dialog input[name="csv_table_name"]').val(fileNameWoExtension);
                $('div#import_dialog button[name="import"]').show();
            break;
            default:
                return alert('unknown file type "' + self.fileType + '"');
            break;
        }
    };
    
    this.importShp = function() {
        var self = this;
        
        var customParams = {};
        
        customParams.mode = $('div#import_dialog input[name="shp_insert_method"]:checked').val();
        if(customParams.mode != 'create') {
            customParams.table_name = $('div#import_dialog select[name="shp_table_name_select"]').val();
        }
        
        customParams.charset = $('div#import_dialog select[name="shp_file_charset"]').val();
        
        self.ajaxImport('shp', 'import-shp', customParams);
    };
    
    this.importXls = function() {
        var self = this;
        
        var customParams = {};
        
        customParams.mode = $('div#import_dialog input[name="xls_insert_method"]:checked').val();
        if(customParams.mode != 'create') {
            customParams.table_name = $('div#import_dialog select[name="xls_table_name_select"]').val();
        }
        
        self.ajaxImport('xls', 'import-xls', customParams);
    };
    
    this.exportShp = function(tableName) {
        var self = this;
        
        self.ajaxRequest({
            type: 'POST',
            data: {action:'export-shp', table_name:tableName},
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    if(typeof(response.result) != 'undefined' && response.result == 'error' && typeof(response.error) != 'undefined') {
                        return $('div#import_dialog div.logs').html(response.error).focus();
                    }
                    return alert('Error');
                }
                
                $('div#import_dialog div.logs').html('Operation done succesfully<br><a href="'+response.filename+'" target="_blank">Click here</a> to download').focus();
            }
        });
    };
    
    this.exportXls = function(tableName) {
        var self = this;
        
        self.ajaxRequest({
            type: 'POST',
            data: {action:'export-xls', table_name:tableName},
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    if(typeof(response.result) != 'undefined' && response.result == 'error' && typeof(response.error) != 'undefined') {
                        return $('div#import_dialog div.logs').html(response.error).focus();
                    }
                    return alert('Error');
                }
                
                $('div#import_dialog div.logs').html('Operation done succesfully<br><a href="export/'+response.filename+'" target="_blank">Click here</a> to download').focus();
            }
        });
    };
    
    this.exportCsv = function(tableName) {
        var self = this;
        
        self.ajaxRequest({
            type: 'POST',
            data: {action:'export-csv', table_name:tableName},
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    if(typeof(response.result) != 'undefined' && response.result == 'error' && typeof(response.error) != 'undefined') {
                        return $('div#import_dialog div.logs').html(response.error).focus();
                    }
                    return alert('Error');
                }
                
                $('div#import_dialog div.logs').html('Operation done succesfully<br><a href="export/'+response.filename+'" target="_blank">Click here</a> to download').focus();
            }
        });
    };
    
    this.createTileindex = function() {
        var self = this;
        
        self.ajaxImport('raster', 'create-tileindex');
    };

    this.createPyramidRaster = function() {
        var self = this;
        
        self.ajaxImport('raster', 'create-pyramid-raster');
    };
    
    this.ajaxImport = function(prefix, action, customParams) {
        var self = this;
        
        if(typeof(customParams) == 'undefined') customParams = {};
        
        var params = {
            action: action,
            file_name: null,
            table_name: null,
            srid: null,
            charset: null,
            mode: null
        };
        params = $.extend(params, customParams);
        
        if(params.file_name == null) {
            params.file_name = $('div#import_dialog input[name="'+prefix+'_file_name"]').val();
            if(params.file_name == '') return alert('Empty file name'); 
        }
        
        if(params.table_name == null) {
            params.table_name = $('div#import_dialog input[name="'+prefix+'_table_name"]').val();
            if(params.table_name == '') return alert('Empty table name');
        }
        
        if(prefix != 'xls' && params.srid == null) {
            params.srid = $('div#import_dialog input[name="'+prefix+'_srid"]').val();
            if(params.srid == '') return alert('Empty srid');
        }
        
        
        self.ajaxRequest({
            type: 'POST',
            data: params,
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    if(typeof(response.result) != 'undefined' && response.result == 'error' && typeof(response.error) != 'undefined') {
                        return $('div#import_dialog div.logs').html(response.error).focus();
                    }
                    return alert('Error');
                }
                
                $('div#import_dialog div.logs').html('Operation done succesfully').focus();
            }
        });
        
    };
    
    this.createTable = function() {
        var self = this;
        
        var tableName = $('div#import_dialog input[name="postgis_table_name"]').val();
        if(tableName == '') return alert('Empty table name');
        
        var srid = $('div#import_dialog input[name="postgis_table_srid"]').val();
        if(srid == '') return alert('Empty srid');
        if(parseInt(srid) != srid) return ('Invalid srid');
        
        var params = {
            action: 'create-table',
            table_name: tableName,
            srid: srid,
            geometry_type: $('div#import_dialog select[name="postgis_geometry_type"]').val(),
            coordinate_dimension: $('div#import_dialog select[name="coordinate_dimension"]').val(),
            columns: []
        };
        
        var numColumns = $('div#import_dialog input[name="num_columns"]').val();
        var column;
        for(var n = 0; n <= parseInt(numColumns); n++) {
            column = {
                name: $('div#import_dialog input[name="column_name_'+n+'"]').val(),
                type: $('div#import_dialog select[name="column_type_'+n+'"]').val()
            };
            params.columns.push(column);
        }
        
        self.ajaxRequest({
            type: 'POST',
            data: params,
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    if(typeof(response.result) != 'undefined' && response.result == 'error' && typeof(response.error) != 'undefined') {
                        return $('div#import_dialog div.logs').html(response.error).focus();
                    }
                    return alert('Error');
                }
                
                $('div#import_dialog div.logs').html('Operation done succesfully').focus();
            }
        });     
    };
    
    this.showAddColumnDialog = function(tableName) {
        $('div#add_column_dialog span[data-role="tablename"]').html(tableName);
        $('div#add_column_dialog').dialog('open');
        console.log($('div#add_column_dialog'));
    };
    
    this.addColumn = function() {
        var self = this;
        
        var tableName = $('div#add_column_dialog span[data-role="tablename"]').html();
        var columnName = $('div#add_column_dialog input[name="column_name"]').val();
        var columnType = $('div#add_column_dialog select[name="column_type"]').val();
        
        if(columnName == '') return alert('Please insert a column name');
        
        var params = {
            action: 'add-column',
            table_name: tableName,
            column_name: columnName,
            column_type: columnType
        };
                
        self.ajaxRequest({
            type: 'POST',
            data: params,
            success: function(response) {
                if(typeof(response) != 'object' || response == null || typeof(response.result) == 'undefined' || response.result != 'ok') {
                    if(typeof(response.result) != 'undefined' && response.result == 'error' && typeof(response.error) != 'undefined') {
                        return $('div#add_column_dialog div.logs').html(response.error).focus();
                    }
                    return alert('Error');
                }
                $('div#add_column_dialog').dialog('close');
            }
        });     
    };
    
    this.showLoading = function() {
        $('div#import_dialog div.loading').show();
    };
    this.hideLoading = function() {
        $('div#import_dialog div.loading').hide();
    };
    
    this.ajaxRequest = function(obj) {
        var self = this;
        
        var defaultObj = {
            type: 'GET',
            url: 'ajax/datamanager.php',
            dataType: 'json',
            data: {catalog_id: self.catalogId},
            success: null,
            beforeSend: function() { self.showLoading() },
            complete: function() { self.hideLoading() },
            error: function() {
                alert('Error');
            }
        };
        obj = $.extend(true, defaultObj, obj);
        $.ajax(obj);
    };
}

var fileHandler = (function (uploader) {
    'use strict';

    var uiProcess = function (files) {
        /*// files is a FileList of File objects. List some properties.
        var output = [];
        var totalSize = 0;
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            output.push(
                '<li><strong>',
                escape(f.name),
                '</strong> (',
                f.type || 'n/a',
                ') - ',
                f.size,
                ' bytes, last modified: ',
                f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
                '</li>'
            );
            totalSize += f.size;
        }
        document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
        console.log(totalSize/1024);*/
    };

    function dragAndDrop(id) {
        function handleDragOver(evt) {
            evt.stopPropagation();
            evt.preventDefault();
            evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
        }

        // Setup the dnd listeners.
        var dropZone = document.getElementById(id);
        dropZone.addEventListener('dragover', handleDragOver, false);
        dropZone.addEventListener('drop', function (evt) {
            evt.stopPropagation();
            evt.preventDefault();
            handleFileSelect(evt.dataTransfer.files);
        }, false);
    }

    function input(id) {
        document.getElementById(id).addEventListener('change', function (evt) {
            evt.stopPropagation();
            evt.preventDefault();

            handleFileSelect(evt.target.files);
            evt.target.value = '';

        }, false);
    }

    function handleFileSelect(files) {
        uiProcess();
        var completeAdd = [];
        var fileLength = files.length;
        function setCompleteAdd(file) {
            completeAdd.push(file);
            if (completeAdd.length == fileLength) {
                uploader.startUpload();
            }
        }

        for (var i = 0; i < files.length; i++) {
            uploader.addFile(files[i], setCompleteAdd);
        }
    }

    if (!uploader) {
        return false;
    } else {
        return {
            dragAndDrop: dragAndDrop,
            input: input
        };
    }
});

var uploader = (function (config) {
    'use strict';

    var BYTES_PER_CHUNK = config.bytesPerChunk || 1024 * 1024;
    var TARGET_URL = config.targetUrl || 'ajax/datamanager.php';
    var DATA_URL = config.dataUrl || '';
    var PROGRESS_BAR = config.progressBar || false;
    var validation = config.validation || function (file) {
        return file;
    };
    var validationPromise = config.validationPromise || false;
    var onAllComplete = config.onAllComplete || function () {};
    var errorLog = config.errorLog || function (error) {
        alert(error);
    };

    var files = [];
    var completeCount = 0;

    function addFile(file, callback) {
        function isValid(file) {
            if (!(file instanceof Blob)) { 
                errorLog('Error: not a file');
                return false;
            }

            for (var i = 0; i < files.length; i++) {
                if (files[i].name == file.name) {
                    errorLog('Error: file with the same name already added');
                    return false;
                }
            }
            return true;
        }

        if (!isValid(file)) {
            callback(false);
            return;
        }

        if (validationPromise) {
            validationPromise(file, function (file) {
                if (!!file) {
                    files.push(file);
                } else {
                    errorLog('Error: file not valid');
                }
                callback(file);
                return;
            });
        } else {
            var f = validation(file);
            if (!!f) {
                files.push(f);
            } else {
                errorLog('Error: file not valid');
            }
            callback(file);
            return;
        }

    }

    function startUpload() {
        for (var i = 0; i < files.length; i++) {
            if (PROGRESS_BAR) {
                PROGRESS_BAR.style.display = "inline";
            }
            sendRequest(files[i]);
        }
    }

    function setAsComplete() {
        completeCount++;
        if (completeCount == files.length) {
            files = [];
            completeCount = 0;
            if (PROGRESS_BAR) {
                PROGRESS_BAR.style.display = "none";
            }
            onAllComplete();
        }
    }

    function setDataUrl(dataUrl) {
        DATA_URL = dataUrl;
    }

    function sendRequest(file) {
        var start = 0;
        var end = BYTES_PER_CHUNK;
        var uploadcounter = 0;
        var uploadfilearray = [];

        while( start < file.size ) {
            var chunk = file.slice(start, end);
            uploadfilearray[uploadcounter] = chunk;
            uploadcounter++;
            start = end;
            end = start + BYTES_PER_CHUNK;
        }

        if (PROGRESS_BAR) {
            PROGRESS_BAR.max = PROGRESS_BAR.max + uploadcounter;
        }

        uploadcounter = 0;
        uploadFile();
        
        function uploadFile() {
            var fd = new FormData();
            fd.append("fileToUpload", uploadfilearray[uploadcounter]);

            var xhr = new XMLHttpRequest();

            xhr.open("POST", TARGET_URL + '?filename=' + file.name + '&' + DATA_URL);

            xhr.addEventListener("error", transferFailed, false);
            //xhr.addEventListener("abort", transferCanceled, false);
            xhr.addEventListener("load", uploadComplete, false);
            xhr.onload = function (e) {
                uploadcounter++;
                if (uploadfilearray.length > uploadcounter ) {
                    uploadFile(uploadfilearray[uploadcounter], file.name);
                } else {
                    setAsComplete();
                }
            };

            xhr.send(fd);
        }

        function uploadComplete() {
            if (PROGRESS_BAR) {
                PROGRESS_BAR.value = (PROGRESS_BAR.value? PROGRESS_BAR.value : 1) + 1;
            }
        }

        function transferFailed() {
            uploadFile(uploadfilearray[uploadcounter], file.name);
        }
    }

    return {
        addFile: addFile,
        setDataUrl: setDataUrl,
        startUpload: startUpload,
    };
});
