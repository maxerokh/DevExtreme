var $ = require("../../core/renderer"),
    extend = require("../../core/utils/extend").extend,
    messageLocalization = require("../../localization/message"),
    TextBox = require("../text_box"),
    errors = require("../widget/ui.errors"),
    Deferred = require("../../core/utils/deferred").Deferred;

/**
* @name SearchBoxMixin
* @module ui/widget/ui.search_box_mixin
* @export default
* @hidden
*/

module.exports = {
    _getDefaultOptions: function() {
        return extend(this.callBase(), {
            /**
            * @name SearchBoxMixinOptions.searchMode
            * @type Enums.CollectionSearchMode
            * @default 'contains'
            */
            searchMode: "",

            /**
            * @name SearchBoxMixinOptions.searchExpr
            * @type getter|Array<getter>
            * @default null
            */
            searchExpr: null,

            /**
            * @name SearchBoxMixinOptions.searchValue
            * @type String
            * @default ""
            */
            searchValue: "",

            /**
            * @name SearchBoxMixinOptions.searchEnabled
            * @type boolean
            * @default false
            */
            searchEnabled: false,

            /**
             * @name SearchBoxMixinOptions.searchEditorOptions
             * @type dxTextBoxOptions
             * @default {}
             */
            searchEditorOptions: {},

            /**
            * @name SearchBoxMixinOptions.searchTimeout
            * @type number
            * @default undefined
            */
        });
    },

    _initMarkup: function() {
        this._renderSearch();
        this.callBase();
    },

    _renderSearch: function() {
        var editorOptions,
            $element = this.$element(),
            searchEnabled = this.option("searchEnabled"),
            searchBoxClassName = this._addWidgetPrefix("search"),
            rootElementClassName = this._addWidgetPrefix("with-search");

        if(!searchEnabled) {
            $element.removeClass(rootElementClassName);
            this._removeSearchBox();
            return;
        }

        editorOptions = this._getSearchEditorOptions();

        if(this._searchEditor) {
            this._searchEditor.option(editorOptions);
        } else {
            $element.addClass(rootElementClassName);
            this._$searchEditorElement = $("<div>").addClass(searchBoxClassName).prependTo($element);
            this._searchEditor = this._createComponent(this._$searchEditorElement, TextBox, editorOptions);
        }
    },

    _removeSearchBox: function() {
        this._$searchEditorElement && this._$searchEditorElement.remove();
        delete this._$searchEditorElement;
        delete this._searchEditor;
    },

    _getSearchEditorOptions: function() {
        var that = this,
            userEditorOptions = that.option("searchEditorOptions");

        return extend({
            mode: "search",
            placeholder: messageLocalization.format("Search"),
            tabIndex: that.option("tabIndex"),
            value: that.option("searchValue"),
            valueChangeEvent: "input",
            onValueChanged: function(e) {
                var searchTimeout = that.option("searchTimeout");
                that._valueChangeDeferred = new Deferred();
                clearTimeout(that._valueChangeTimeout);

                that._valueChangeDeferred.done(function() {
                    this.option("searchValue", e.value);
                }.bind(that));

                if(e.event && e.event.type === "input" && searchTimeout) {
                    that._valueChangeTimeout = setTimeout(function() {
                        that._valueChangeDeferred.resolve();
                    }, searchTimeout);
                } else {
                    that._valueChangeDeferred.resolve();
                }
            }
        }, userEditorOptions);
    },

    _getAriaTarget: function() {
        return this.$element();
    },

    _focusTarget: function() {
        if(this.option("searchEnabled")) {
            return this._itemContainer();
        }

        return this.callBase();
    },

    _updateFocusState: function(e, isFocused) {
        if(this.option("searchEnabled")) {
            this._toggleFocusClass(isFocused, this.$element());
        }
        this.callBase(e, isFocused);
    },

    getOperationBySearchMode: function(searchMode) {
        return searchMode === "equals" ? "=" : searchMode;
    },

    _optionChanged: function(args) {
        switch(args.name) {
            case "searchEnabled":
            case "searchEditorOptions":
                this._invalidate();
                break;
            case "searchExpr":
            case "searchMode":
            case "searchValue":
                if(!this._dataSource) {
                    errors.log("W1009");
                    return;
                }
                if(args.name === "searchMode") {
                    this._dataSource.searchOperation(this.getOperationBySearchMode(args.value));
                } else {
                    this._dataSource[args.name](args.value);
                }
                this._dataSource.load();
                break;
            case "searchTimeout":
                break;
            default:
                this.callBase(args);
        }
    },

    focus: function() {
        if(!this.option("focusedElement") && this.option("searchEnabled")) {
            this._searchEditor && this._searchEditor.focus();
            return;
        }

        this.callBase();
    },

    _refresh: function() {
        if(this._valueChangeDeferred) {
            this._valueChangeDeferred.resolve();
        }

        this.callBase();
    }
};
