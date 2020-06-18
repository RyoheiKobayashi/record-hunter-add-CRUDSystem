({
    onInit: function (c, e, h) {

    },
    onAfterScriptsLoaded: function (c, e, h) {
        // 最初に、余分なスペースを削除してフィールド名を整理します
        // 便宜上、すべて小文字に変換します。
        // 次にフィールドをリクエストし、後で使用するために結果をpromiseオブジェクトに保存します。
        const fieldNames = [];
        c.get("v.fieldNames").split(",").forEach(function (fieldName) {
            fieldNames.push(fieldName.trim().toLowerCase());
        });
        const p_getFields = h.getFields(c, h, c.get("v.objectName"), fieldNames.join(','));

        // 次に、コンテキストレコードからデフォルト値を取得します
        // ユーザーがリクエストし、コンテキストレコードがある場合。
        // それ以外の場合は、サーバー要求なしで、デフォルト値として指定された値を使用します。
        // ここでも、後で使用するために結果をpromiseオブジェクトに保存します。
        const recordId = c.get("v.recordId");
        const fieldNamesOrDefaultValues = [];
        if (c.get("v.fieldNamesOrDefaultValues")) {
            c.get("v.fieldNamesOrDefaultValues").split(",").forEach(function (value) {
                fieldNamesOrDefaultValues.push(value.trim().toLowerCase());
            });
        }
        let p_getDefaultValues = Promise.resolve(fieldNamesOrDefaultValues);
        if (recordId) p_getDefaultValues = h.getDefaultValues(c, h, recordId, fieldNamesOrDefaultValues.join(','));

        // フィールドとデフォルト値の準備ができたら、
        // 検索ボックスインターフェイスのセットアップを開始できます。
        // ここでは、以下を行う必要があります。
        // 1.フィールドにエラーやその他の障害がないことを確認します。
        // 2.各フィールドにデフォルト値を挿入します。
        // 3.フィールドを適切なヘッダーラベルでグループ化します。
        Promise.all([p_getFields, p_getDefaultValues])
            .then($A.getCallback(function ([fields, defaultValues]) {

                // 最初に、フィールドを前処理します。
                // このステップには、
                // 1.サポートされていないか、このコンポーネントのml機能を引き起こす可能性のあるフィールドを無効にします
                // 2.このコンポーネントでサポートされていないフィールドを無効にする
                let index = 1;
                fields.forEach(function (field) {
                    if (!field) {
                        fields[index] = null;
                    } else if (!field.isFilterable && field.type !== "LOCATION") {
                        h.showError(c, h, `onAfterScriptsLoaded : The type '${field.name}' of '${field.objectName}' is not a queryable field.`);
                        fields[index] = null;
                    } else if (field.type == "ADDRESS" || field.type == "COMBOBOX" || field.type == "REFERENCE" || field.type == "ANYTYPE"
                        || field.type == "BASE64" || field.type == "DATACATEGORYGROUPREFERENCE" || field.type == "ENCRYPTEDSTRING" || field.type == "LOCATION") {
                        h.showError(c, h, `onAfterScriptsLoaded : The type '${field.type}' for '${field.name}' of '${field.objectName}' is unsupported.`);
                        fields[index] = null;
                    } else {
                        field.index = index++;
                    }
                });

                return [fields, defaultValues];
            }))
            .then($A.getCallback(function ([fields, defaultValues]) {

                // 次に、フィールドにデフォルト値を事前に入力します。
                // キーワード検索が有効な場合、最初の値は常にキーワードに設定されます。
                // 残りの値はリストの順にフィールドに挿入されます。
                // フィールドの可視性はランタイムユーザーに依存するため、
                // hidden（invisible）フィールドも値を消費します。
                // 一方、無効なフィールドは値を消費しません
                // 誰がコンポーネントを実行しているかに関係なく、無効なフィールドは常に無効であるため。

                c.set("v.keyword", defaultValues.shift());
                fields.forEach(function (field) {
                    if (!field) {
                        // skip if null or invalid
                    } else if (field.type === "INTEGER" || field.type === "PERCENT" || field.type === "CURRENCY" || field.type === "DOUBLE") {
                        const min = defaultValues.shift();
                        const max = defaultValues.shift();
                        field.minValue = min ? +min : "";
                        field.maxValue = max ? +max : "";
                    } else if (field.type === "DATE") {
                        const min = defaultValues.shift();
                        const max = defaultValues.shift();
                        field.minValue = min ? moment(min).format("YYYY-MM-DD") : "";
                        field.maxValue = max ? moment(max).format("YYYY-MM-DD") : "";
                    } else if (field.type === "DATETIME") {
                        const min = defaultValues.shift();
                        const max = defaultValues.shift();
                        field.minValue = min ? moment(min + ":000Z").format("YYYY-MM-DDTHH:mm") : "";
                        field.maxValue = max ? moment(max + ":000Z").format("YYYY-MM-DDTHH:mm") : "";
                    } else if (field.type === "BOOLEAN") {
                        field.value = defaultValues.shift() === "true";
                    } else if (field.type === "PICKLIST") {
                        const value = defaultValues.shift();
                        field.options.forEach(function (option) {
                            if (option.value === value) {
                                option.isSelected = true;
                                field.value = value;
                            }
                        });
                    } else {
                        field.value = defaultValues.shift();
                    }
                });
                c.set("v.fields", fields);

                return [fields, defaultValues];
            }))
            .then($A.getCallback(function ([fields, defaultValues]) {

                // ここでフィールドを後処理します。
                // これは主にユーザー固有の制限またはアクセス制御を強制するためのものです
                // このステップには、
                // 1.現在のユーザーがアクセスする権限のないフィールドへのアクセスを禁止するために非表示にします。
                fields.forEach(function (field, index) {
                    if (field && !field.isAccessible) {
                        fields[index] = null;
                    }
                });

                return [fields, defaultValues];
            }))
            .then($A.getCallback(function ([fields, defaultValues]) {

                // 次に、カスタムロジックが指定されていない場合は、デフォルトロジックを派生させます。
                // インデックス0はキーワード用に予約されており、残りは各フィールドのインデックスに従います。
                let customLogic = c.get("v.customLogic");

                if (!customLogic) {
                    const indices = fields.reduce(function (prev, field) {
                        if (field) prev.push(field.index);
                        return prev;
                    }, []);

                    customLogic = "0"
                    customLogic += indices.length > 0 ? " AND " + indices.join(" AND ") : "";
                }
                c.set("v.customLogic", customLogic);

                return [fields, defaultValues];
            }))
            .then($A.getCallback(function ([fields, defaultValues]) {

                // 次に、指定したグループサイズのサイズでフィールドをグループ化します。
                // グループオブジェクトはフィールドとヘッダーで構成されます。
                const headers = [];
                if (c.get("v.sectionHeaders")) {
                    c.get("v.sectionHeaders").split(",").forEach(function (header) {
                        header = header.trim();
                        headers.push(header ? { label: header } : null);
                    });
                }

                const groups = [];
                while (headers.length > 0 || fields.length > 0) {
                    const group = {
                        header: headers.shift(),
                        fields: []
                    };
                    let count = c.get("v.numGroupItems");
                    while (count--) group.fields.push(fields.shift());
                    groups.push(group);
                }
                c.set("v.groups", groups);
            }))

            .catch(function (reason) {
                h.showError(c, h, "onAfterScriptsLoaded : " + reason);
            });

    },
    onFilterControlButtonClicked: function (c, e, h) {
        c.set("v.isConditionFolded", !c.get("v.isConditionFolded"));
    },
    onSearch: function (c, e, h) {
        console.log("★★★★ 関数を開始する ： onSearch");
        // これは、ユーザーが検索を要求したときに呼び出される関数です。
        // サーバー上のレコードをクエリする前に行うべきことがいくつかあります。
        // - インジケーターを表示します。
        // - すべてのnull条件を取り除く。
        // - 値をSOQLクエリの予期される形式にフォーマットします。
        h.showSpinner(c, h);

        const fields = c.get("v.fields").filter(function (field) { return field; });
        console.log("★★ 変数 fields ： ", fields);
        fields.forEach(function (field) {
            console.log("★★ 変数 field ： ", field);
            console.log("★★ 変数 field.type ： ", field.type);
            if (field.type === "DATETIME") {
                if (field.minValue) field.minValue = moment(field.minValue).format("YYYY-MM-DDThh:mm:ssZ");
                if (field.maxValue) field.maxValue = moment(field.maxValue).format("YYYY-MM-DDThh:mm:ssZ");
            } else if (field.type === "TIME") {
                if (field.minValue && !field.minValue.endsWith("Z")) field.minValue += "Z";
                if (field.maxValue && !field.maxValue.endsWith("Z")) field.maxValue += "Z";
            } else if (field.type === "BOOLEAN") {
                if (c.get("v.isCheckboxIgnoredIfUnchecked") && !field.value) {
                    field.value = "";
                }
            }
        });

        // これで、サーバーにレコードのクエリを要求する時が来ました。
        // サーバーからの再構成は、一致するレコードのレコードIDのみです。
        // これは検索コンポーネントなので、他のコンポーネントに表示を許可します。
        // 3つのオプションがあります。
        // -TAB：新しいページ、またはコンソールの場合はタブを開いて、データテーブルに結果を表示します。
        // -EVENT：アプリケーションイベントであるRecordHunterEventを起動して、同じページ内の他のコンポーネントに結果を伝達します。
        h.findRecords(c, h, c.get("v.objectName"), c.get("v.keyword"), JSON.stringify(fields), c.get("v.customLogic"))
            // then() メソッドは Promise を返します。最大2つの引数、 Promise が成功した場合と失敗した場合のコールバック関数を取ります。
            .then($A.getCallback(function (recordIds) {
                h.fireAppEvent(c, h, "e.c:RecordEvent", {
                    recordIds: recordIds,
                });
            }))
            .catch(function (reason) {
                h.showError(c, h, "onSearch : " + reason);
            })
            .then($A.getCallback(function () {
                h.hideSpinner(c, h);
            }));
        console.log("★★★★ 関数を終了する ： onSearch");
    },
})