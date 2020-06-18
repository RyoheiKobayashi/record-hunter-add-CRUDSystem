({
    valueInit: function (c, e, h) {
        h.initFlows(c, h);
        h.initColumns(c, h);
    },
    onRecordHunterEvent: function (c, e, h) {
        console.log("★★★★ 関数を開始する ： onRecordHunterEvent");

        c.find("dataTable").set("v.enableInfiniteLoading", true);
        c.set("v.offset", 0);
        // イベントパラメータの取得 参考：https://developer.salesforce.com/docs/atlas.ja-jp.lightning.meta/lightning/js_event.htm
        c.set("v.recordIds", e.getParam("recordIds"));
        c.set("v.data", []);
        h.loadData(c, h);

        console.log("★★★★ 関数を終了する ： onRecordHunterEvent");
    },
    onLoadMoreData: function (c, e, h) {
        if (c.get("v.recordIds").length > c.get("v.data").length) h.loadData(c, h);
    },
    onSort: function (c, e, h) {
        let fieldName = e.getParam("fieldName");
        const sortDirection = e.getParam("sortDirection");
        c.set("v.sortedBy", fieldName);
        c.set("v.sortedDirection", sortDirection);
        const data = c.get("v.data");
        data.sort(function (a, b) {
            let val1 = a[fieldName],
                val2 = b[fieldName];
            val1 =
                typeof val1 === "string" || val1 instanceof String
                    ? val1.toUpperCase()
                    : val1;
            val2 =
                typeof val2 === "string" || val2 instanceof String
                    ? val2.toUpperCase()
                    : val2;
            const reverse = sortDirection === "asc" ? 1 : -1;
            if (val1 === undefined) return -1 * reverse;
            if (val2 === undefined) return 1 * reverse;
            if (val1 < val2) return -1 * reverse;
            if (val1 > val2) return 1 * reverse;
            return 0;
        });
        c.set("v.data", data);
    },
    onRowAction: function (c, e, h) {
        console.log("★★★★ 関数を開始する ： onRowAction");
        console.log("★★ 変数 e ： ", e);
        const action = e.getParam("action");
        console.log("★★ 変数 action ： ", action);
        const row = e.getParam("row");
        console.log("★★ 変数 row ： ", row);
        switch (action.name) {
            case "showDetail":
                const key = action.label.fieldName;
                console.log("★★ 変数 key ： ", key);
                const pathForId = key.substring(0, key.lastIndexOf(".")) + ".id";
                console.log("★★ 変数 pathForId ： ", pathForId);
                // h.navigateToSObject(c, h, row[pathForId]);
                console.log("★★ 変数 row[pathForId] ： ", row[pathForId]);
                h.fireAppEvent(c, h, "e.c:RecordIdRelationEvent", {
                    recordId: row[pathForId],
                });
                break;
        }
        console.log("★★★★ 関数を終了する ： onRowAction");
    },
    onFlowSelected: function (c, e, h) {
        const selectedIds = c
            .find("dataTable")
            .getSelectedRows()
            .reduce(function (prev, row) {
                prev.push(row[c.get("v.objectName").toLowerCase() + ".id"]);
                return prev;
            }, []);
        h.initFlowComponent(c, h)
            .then(
                $A.getCallback(function (flowComponent) {
                    c.set("v.modalBody", [flowComponent]);
                    flowComponent.startFlow(e.getParam("value"), [
                        {
                            name: "contextId",
                            type: "String",
                            value: c.get("v.recordId")
                        },
                        {
                            name: "selectedIds",
                            type: "String",
                            value: selectedIds
                        }
                    ]);
                })
            )
            .catch(function (reason) {
                h.showError(c, h, "controller.onFlowSelected : " + reason);
            });
    },
    onFlowStatusChanged: function (c, e, h) {
        switch (e.getParam("status")) {
            case "FINISHED":
                c.set("v.modalBody", []);
                c.find("dataTable").set("v.enableInfiniteLoading", true);
                c.set("v.offset", 0);
                c.set("v.data", []);
                h.loadData(c, h);
                break;
            case "FINISHED_SCREEN":
            case "STARTED":
            case "PAUSED":
            case "ERROR":
                break;
        }
    },
    onFlowClosed: function (c, e, h) {
        c.set("v.modalBody", []);
    }
});