// Task		| By	| Date		    | Modification Description
// ---------|-------|---------------|-------------------------
// 201100   |    RS | 03/28/17      | Created
// 232823   | NRJ   | 03/26/19      | Modified such that configs menu drop down will be hidden when there are no items in it.


_webUi.inventoryInsight = function () {
    
    $(window).load(function () {
        var configsMenuList = [];
        configsMenuList = $('a#InsightMenuConfigActionsDropdown').parent().find('ul li');

        //hide configs menu if there are no items in it.
        if (configsMenuList && configsMenuList.length === 0)
            $('a#InsightMenuConfigActionsDropdown').parent().hide();
    });   

    //public functions
    return {

        editOverrides: function (evt) {

            var grid = $("#ListPaneDataGrid");
            var gridselectedRows = grid.igGrid("selectedRows");

            if (gridselectedRows.count() !== 1)
                return;

            var rowData = grid.data('igGrid').dataSource.dataView()[gridselectedRows[0].index];
            var url = encodeURI('/scale/trans/locationunitmeasure?internalLocationInv=' + rowData.INTERNAL_LOCATION_INV + '&item=' + rowData.ITEM + '&company=' + (rowData.COMPANY == null ? '' : rowData.COMPANY) + '&warehouse=' + rowData.WAREHOUSE);

            if (rowData.OVERRIDES < 1) {
                $("#InsightMenuActionsDropdown").parent().removeClass("open");

                ResourceJSPromise.then(function () {

                    var promise = _webUi.dialog.showYesNoConfirmation(ResourceManager.GetResource("MSG_OVERRIDELOC02", ResourceManager.ResourceType.Msg).TEXT,
                            "MSG_OVERRIDELOC02", null, null);

                    promise.then(function (confirmed) {
                        if (confirmed) {
                            window.location = url;
                        }
                    });

                })
            } else
                window.location = url;
                                    
            return false;
        }

    }
}();