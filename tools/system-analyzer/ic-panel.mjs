// Copyright 2020 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Group} from './ic-model.mjs';
import CustomIcProcessor from "./ic-processor.mjs";
import {SelectEvent} from './events.mjs';
import {defineCustomElement, V8CustomElement} from './helper.mjs';

defineCustomElement('ic-panel', (templateText) =>
  class ICPanel extends V8CustomElement {
  //TODO(zcankara) Entries never set
  #entries;
  #filteredEntries;
  constructor() {
    super(templateText);
    this.groupKey.addEventListener(
        'change', e => this.updateTable(e));
    this.$('#filterICTimeBtn').addEventListener(
      'click', e => this.handleICTimeFilter(e));
  }

  get entries(){
    return this.#entries;
  }

  get groupKey() {
    return this.$('#group-key');
  }

  get table() {
    return this.$('#table');
  }

  get tableBody() {
    return this.$('#table-body');
  }

  get count() {
    return this.$('#count');
  }

  get spanSelectAll(){
    return this.querySelectorAll("span");
  }

  set filteredEntries(value){
    this.#filteredEntries = value;
    this.updateTable();
  }

  get filteredEntries(){
    return this.#filteredEntries;
  }

  updateTable(event) {
    let select = this.groupKey;
    let key = select.options[select.selectedIndex].text;
    let tableBody = this.tableBody;
    this.removeAllChildren(tableBody);
    let groups = Group.groupBy(this.filteredEntries, key, true);
    this.render(groups, tableBody);
  }

  escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  processValue(unsafe) {
    if (!unsafe) return "";
    if (!unsafe.startsWith("http")) return this.escapeHtml(unsafe);
    let a = document.createElement("a");
    a.href = unsafe;
    a.textContent = unsafe;
    return a;
  }

  td(tr, content, className) {
    let node = document.createElement("td");
    if (typeof content == "object") {
      node.appendChild(content);
    } else {
      node.innerHTML = content;
    }
    node.className = className;
    tr.appendChild(node);
    return node
  }

  handleMapClick(e){
    this.dispatchEvent(new SelectEvent(e.target.parentNode.entry));
  }

  handleFilePositionClick(e){
    this.dispatchEvent(new SelectEvent(e.target.parentNode.entry.key));
  }

  render(entries, parent) {
    let fragment = document.createDocumentFragment();
    let max = Math.min(1000, entries.length)
    for (let i = 0; i < max; i++) {
      let entry = entries[i];
      let tr = document.createElement("tr");
      tr.entry = entry;
      //TODO(zcankara) Create one bound method and use it everywhere
      if (entry.property === "map") {
        tr.addEventListener('click', e => this.handleMapClick(e));
      } else if (entry.property == "filePosition") {
        tr.addEventListener('click',
          e => this.handleFilePositionClick(e));
      }
      let details = this.td(tr,'<span>&#8505;</a>', 'details');
      //TODO(zcankara) don't keep the whole function context alive
      details.onclick = _ => this.toggleDetails(details);
      this.td(tr, entry.percentage + "%", 'percentage');
      this.td(tr, entry.count, 'count');
      this.td(tr, this.processValue(entry.key), 'key');
      fragment.appendChild(tr);
    }
    let omitted = entries.length - max;
    if (omitted > 0) {
      let tr = document.createElement("tr");
      let tdNode = this.td(tr, 'Omitted ' + omitted + " entries.");
      tdNode.colSpan = 4;
      fragment.appendChild(tr);
    }
    parent.appendChild(fragment);
  }


  renderDrilldown(entry, previousSibling) {
    let tr = document.createElement('tr');
    tr.className = "entry-details";
    tr.style.display = "none";
    // indent by one td.
    tr.appendChild(document.createElement("td"));
    let td = document.createElement("td");
    td.colSpan = 3;
    for (let key in entry.groups) {
      td.appendChild(this.renderDrilldownGroup(entry, key));
    }
    tr.appendChild(td);
    // Append the new TR after previousSibling.
    previousSibling.parentNode.insertBefore(tr, previousSibling.nextSibling)
  }

  renderDrilldownGroup(entry, key) {
    let max = 20;
    let group = entry.groups[key];
    let div = document.createElement("div")
    div.className = 'drilldown-group-title'
    div.textContent = key + ' [top ' + max + ' out of ' + group.length + ']';
    let table = document.createElement("table");
    this.render(group.slice(0, max), table, false)
    div.appendChild(table);
    return div;
  }

 toggleDetails(node) {
    let tr = node.parentNode;
    let entry = tr.entry;
    // Create subgroup in-place if the don't exist yet.
    if (entry.groups === undefined) {
      entry.createSubGroups();
      this.renderDrilldown(entry, tr);
    }
    let details = tr.nextSibling;
    let display = details.style.display;
    if (display != "none") {
      display = "none";
    } else {
      display = "table-row"
    };
    details.style.display = display;
  }

  initGroupKeySelect() {
    let select = this.groupKey;
    select.options.length = 0;
    for (let i in CustomIcProcessor.kProperties) {
      let option = document.createElement("option");
      option.text = CustomIcProcessor.kProperties[i];
      select.add(option);
    }
  }

  handleICTimeFilter(e) {
    const startTime = parseInt(this.$('#filter-time-start').value);
    const endTime = parseInt(this.$('#filter-time-end').value);
    const dataModel = {startTime, endTime};
    this.dispatchEvent(new CustomEvent(
      'ictimefilter', {bubbles: true, composed: true, detail: dataModel}));
  }

});
