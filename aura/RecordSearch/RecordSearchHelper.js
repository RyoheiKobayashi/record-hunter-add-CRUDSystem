({
    fireAppEvent: function (c, h, eventDef, evntAttributes) {
        console.log("★★★★ 関数を開始する ： fireAppEvent");
        console.log("★★ 変数 c ： ", c);
        console.log("★★ 変数 h ： ", h);
        console.log("★★ 変数 eventDef ： ", eventDef);
        console.log("★★ 変数 evntAttributes ： ", evntAttributes);
        var appEvent = $A.get(eventDef);
        appEvent.setParams(evntAttributes);
        appEvent.fire();
        console.log("★★★★ 関数を終了する ： fireAppEvent");
    },
    getFields: function (c, h, objectName, fieldNames) {
        const action = c.get('c.getFields');
        action.setParams({
            objectName: objectName,
            fieldNames: fieldNames,
        });
        return new Promise(function (resolve, reject) {
            action.setCallback(this, function (response) {
                const ret = response.getReturnValue();
                if (response.getState() === 'SUCCESS') ret.hasError ? reject(ret.message) : resolve(ret);
                else if (response.getState() === 'ERROR') reject(ret.getError());
            });
            $A.enqueueAction(action);
        });
    },
    findRecords: function (c, h, objectName, keyword, fieldsJson, customLogic) {
        console.log("★★★★ 関数を開始する ： findRecords");
        console.log("★★ 変数 c ： ", c);
        console.log("★★ 変数 h ： ", h);
        console.log("★★ 変数 objectName ： ", objectName);
        console.log("★★ 変数 keyword ： ", keyword);
        console.log("★★ 変数 fieldsJson ： ", fieldsJson);
        console.log("★★ 変数 customLogic ： ", customLogic);
        const action = c.get('c.findRecords');
        action.setParams({
            objectName: objectName,
            keyword: keyword,
            fieldsJson: fieldsJson,
            customLogic: customLogic
        });
        // Promise オブジェクトは非同期処理の最終的な完了処理 (もしくは失敗) およびその結果の値を表現します。
        return new Promise(function (resolve, reject) {
            // 次の「行」の action.setCallback(…) は、リモートメソッドコールが返されるときに実行されるコードのブロックです。これは「後で」実行されるため、今のところは脇に置いておきましょう。
            action.setCallback(this, function (response) {
                const ret = response.getReturnValue();
                if (response.getState() === 'SUCCESS') ret.hasError ? reject(ret.message) : resolve(ret);
                else if (response.getState() === 'ERROR') reject(ret.getError());
            });
            // サーバ要求をキューに登録する。
            // コントローラアクションに関しては、これで終了となる。
            // いつ戻ってくるのか、または戻ってくるのかどうかはわからない。
            $A.enqueueAction(action);
            console.log("★★★★ 関数を終了する ： findRecords");
        });
    },
    getDefaultValues: function (c, h, recordId, fieldNamesOrDefaultValues) {
        const action = c.get('c.getDefaultValues');
        action.setParams({
            recordId: recordId,
            fieldNamesOrDefaultValues: fieldNamesOrDefaultValues
        });
        return new Promise(function (resolve, reject) {
            action.setCallback(this, function (response) {
                const ret = response.getReturnValue();
                if (response.getState() === 'SUCCESS') ret.hasError ? reject(ret.message) : resolve(ret);
                else if (response.getState() === 'ERROR') reject(ret.getError());
            });
            $A.enqueueAction(action);
        });
    },
    showSpinner: function (c, h) {
        console.log("★★★★ 関数を開始する ： showSpinner");
        const spinner = c.find("spinner");
        // spinnerを表示する
        $A.util.removeClass(spinner, "slds-hide");
        console.log("★★★★ 関数を終了する ： showSpinner");
    },
    hideSpinner: function (c, h) {
        console.log("★★★★ 関数を開始する ： hideSpinner");
        const spinner = c.find("spinner");
        // spinnerを非表示する
        $A.util.addClass(spinner, "slds-hide");
        console.log("★★★★ 関数を終了する ： hideSpinner");
    },
    showError: function (c, h, message) {
        const isOnAppBuilder = document.location.href.toLowerCase().indexOf('flexipageeditor') >= 0;
        if (isOnAppBuilder) {
            console.error(message);
            c.set('v.errorMessage', message);
        } else {
            const toastEvent = $A.get("e.force:showToast");
            toastEvent.setParams({
                type: 'error',
                mode: 'sticky',
                message: c.get('v.title') + ': ' + message,
            });
            toastEvent.fire();
        }
    }
})