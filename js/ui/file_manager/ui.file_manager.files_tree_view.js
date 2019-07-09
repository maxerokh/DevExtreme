import $ from "../../core/renderer";
import eventsEngine from "../../events/core/events_engine";
import { extend } from "../../core/utils/extend";
import { getImageContainer } from "../../core/utils/icon";
import { noop } from "../../core/utils/common";

import Widget from "../widget/ui.widget";
import TreeViewSearch from "../tree_view/ui.tree_view.search";

import FileManagerFileActionsButton from "./ui.file_manager.file_actions_button";

const FILE_MANAGER_DIRS_TREE_CLASS = "dx-filemanager-dirs-tree";
const FILE_MANAGER_DIRS_TREE_FOCUSED_ITEM_CLASS = "dx-filemanager-focused-item";
const TREE_VIEW_ITEM_CLASS = "dx-treeview-item";

class FileManagerFilesTreeView extends Widget {

    _initMarkup() {
        this._getCurrentDirectory = this.option("getCurrentDirectory");

        this._createFileActionsButton = noop;
        this._storeExpandedState = this.option("storeExpandedState") || false;

        const $treeView = $("<div>")
            .addClass(FILE_MANAGER_DIRS_TREE_CLASS)
            .appendTo(this.$element());

        const treeViewOptions = {
            dataStructure: "plain",
            rootValue: "",
            createChildren: this._onFilesTreeViewCreateSubDirectories.bind(this),
            itemTemplate: this._createFilesTreeViewItemTemplate.bind(this),
            keyExpr: "fileItem.key",
            parentIdExpr: "parentDirectory.fileItem.key",
            displayExpr: "fileItem.name",
            hasItemsExpr: "fileItem.hasSubDirs",
            onItemClick: this._createActionByOption("onDirectoryClick"),
            onItemExpanded: e => this._onFilesTreeViewItemExpanded(e),
            onItemCollapsed: e => this._onFilesTreeViewItemCollapsed(e),
            onItemRendered: e => this._onFilesTreeViewItemRendered(e)
        };

        if(this._contextMenu) {
            this._contextMenu.option("onContextMenuHidden", () => this._onContextMenuHidden());
            treeViewOptions.onItemContextMenu = e => this._onFilesTreeViewItemContextMenu(e);
            this._createFileActionsButton = (element, options) => this._createComponent(element, FileManagerFileActionsButton, options);
        }

        this._filesTreeView = this._createComponent($treeView, TreeViewSearch, treeViewOptions);

        eventsEngine.on($treeView, "click", treeViewOptions.onItemClick.bind(this));
    }

    _render() {
        super._render();

        const that = this;
        setTimeout(() => {
            that._updateFocusedElement();
        });
    }

    _onFilesTreeViewCreateSubDirectories(rootItem) {
        const getDirectories = this.option("getDirectories");
        const directoryInfo = rootItem && rootItem.itemData || null;
        return getDirectories && getDirectories(directoryInfo);
    }

    _onFilesTreeViewItemRendered({ itemData }) {
        const currentDirectory = this._getCurrentDirectory();
        if(currentDirectory && currentDirectory.fileItem.equals(itemData.fileItem)) {
            this._updateFocusedElement();
        }
    }

    _onFilesTreeViewItemExpanded({ itemData }) {
        if(this._storeExpandedState) {
            itemData.expanded = true;
        }
    }

    _onFilesTreeViewItemCollapsed({ itemData }) {
        if(this._storeExpandedState) {
            itemData.expanded = false;
        }
    }

    _createFilesTreeViewItemTemplate(itemData, itemIndex, itemElement) {
        const $itemElement = $(itemElement);
        const $itemWrapper = $itemElement.closest(this._filesTreeViewItemSelector);
        $itemWrapper.data("item", itemData);

        const $button = $("<div>");
        $itemElement.append(
            getImageContainer(itemData.icon),
            $("<span>").text(itemData.fileItem.name),
            $button);

        this._createFileActionsButton($button, {
            onClick: e => this._onFileItemActionButtonClick(e)
        });
    }

    _onFilesTreeViewItemContextMenu({ itemElement, event }) {
        event.preventDefault();
        const itemData = $(itemElement).data("item");
        this._contextMenu.showAt([ itemData ], itemElement, event);
    }

    _onFileItemActionButtonClick({ component, element, event }) {
        event.stopPropagation();
        const $item = component.$element().closest(this._filesTreeViewItemSelector);
        const item = $item.data("item");
        this._contextMenu.showAt([ item ], element);
        this._activeFileActionsButton = component;
        this._activeFileActionsButton.setActive(true);
    }

    _onContextMenuHidden() {
        if(this._activeFileActionsButton) {
            this._activeFileActionsButton.setActive(false);
        }
    }

    _updateFocusedElement() {
        const directoryInfo = this._getCurrentDirectory();
        const $element = this._getItemElementByKey(directoryInfo.fileItem.key);
        if(this._$focusedElement) {
            this._$focusedElement.toggleClass(FILE_MANAGER_DIRS_TREE_FOCUSED_ITEM_CLASS, false);
        }
        this._$focusedElement = $element || $();
        this._$focusedElement.dirInfo = directoryInfo;
        this._$focusedElement.toggleClass(FILE_MANAGER_DIRS_TREE_FOCUSED_ITEM_CLASS, true);
    }

    _getItemElementByKey(key) {
        const node = this._filesTreeView && this._filesTreeView._dataAdapter.getNodeByKey(key);
        if(node) {
            const $node = this._filesTreeView._getNodeElement(node);
            if($node) {
                return $node.children(this._filesTreeViewItemSelector);
            }
        }
        return null;
    }

    _getDefaultOptions() {
        return extend(super._getDefaultOptions(), {
            storeExpandedState: false,
            initialFolder: null,
            contextMenu: null,
            getItems: null,
            getCurrentDirectory: null,
            onDirectoryClick: null
        });
    }

    _optionChanged(args) {
        const name = args.name;

        switch(name) {
            case "storeExpandedState":
                this._storeExpandedState = this.option(name);
                break;
            case "getItems":
            case "rootFolderDisplayName":
            case "initialFolder":
            case "contextMenu":
                this.repaint();
                break;
            case "getCurrentDirectory":
                this.getCurrentDirectory = this.option(name);
                break;
            case "onDirectoryClick":
                this._filesTreeView.option("onItemClick", this._createActionByOption("onDirectoryClick"));
                break;
            default:
                super._optionChanged(args);
        }
    }

    get _filesTreeViewItemSelector() {
        return `.${TREE_VIEW_ITEM_CLASS}`;
    }

    get _contextMenu() {
        return this.option("contextMenu");
    }

    expandDirectory(directoryInfo) {
        directoryInfo && this._filesTreeView.expandItem(directoryInfo.fileItem.key);
    }

    refresh() {
        this._$focusedElement = null;
        this._filesTreeView.option("dataSource", []);
    }

    updateCurrentDirectory() {
        this._updateFocusedElement();
    }

}

module.exports = FileManagerFilesTreeView;
