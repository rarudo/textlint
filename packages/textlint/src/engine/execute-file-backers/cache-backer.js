// MIT © 2016 azu
"use strict";
const fileEntryCache = require("file-entry-cache");
const debug = require("debug")("CacheBacker");
import AbstractBacker from "./abstruct-backer";
export default class CacheBacker extends AbstractBacker {
    /**
     * @param {Config} config
     */
    constructor(config) {
        super();
        /**
         * @type {boolean}
         */
        this.isEnabled = config.cache;
        this.fileCache = fileEntryCache.create(config.cacheLocation);
        /**
         * @type {string}
         */
        this.hashOfConfig = config.hash;
    }

    /**
     * @param {string} filePath
     * @returns {boolean}
     */
    shouldExecute({filePath}) {
        if (!this.isEnabled) {
            return true;
        }
        const descriptor = this.fileCache.getFileDescriptor(filePath);
        const meta = descriptor.meta || {};
        // if the config is changed or file is changed, should execute return true
        const isNotChanged = descriptor.changed || meta.hashOfConfig !== this.hashOfConfig;
        debug(`Skipping file since hasn't changed: ${filePath}`);
        return isNotChanged;
    }

    /**
     * @param {TextLintResult} result
     */
    didExecute({result}) {
        if (!this.isEnabled) {
            return;
        }
        const filePath = result.filePath;
        const descriptor = this.fileCache.getFileDescriptor(filePath);
        const meta = descriptor.meta || {};
        /*
         * if a file contains messages we don't want to store the file in the cache
         * so we can guarantee that next execution will also operate on this file
         */
        if (result.messages.length > 0) {
            debug(`File has problems, skipping it: ${filePath}`);
            // remove the entry from the cache
            this.fileCache.removeEntry(filePath);
        } else {
            // cache `config.hash`
            meta.hashOfConfig = this.hashOfConfig;
        }
    }

    /**
     * destroy all cache
     */
    destroyCache() {
        this.fileCache.destroy();
    }

    afterAll() {
        // persist cache
        this.fileCache.reconcile();
    }
}
