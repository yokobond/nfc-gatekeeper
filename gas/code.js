/* eslint-disable no-unused-vars */
const activeSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();

/**
 * Convert epoch time to date time entry
 * @param {number} epochTime
 * @returns {string}
 */
function toDateTimeEntry(epochTime) {
  const date = new Date(epochTime);
  //get timezone of spreadsheet
  var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  //format date to readable format
  var formatted = Utilities.formatDate(date, tz, 'yyyy/MM/dd HH:mm:ss');
  return formatted;
}

/**
 * Log data to sheet
 * @param {any} data
 */
function sheetLog(data) {
  const dataSheet = activeSpreadSheet.getSheetByName('log');
  dataSheet.appendRow([toDateTimeEntry(Date.now()), JSON.stringify(data)]);
}

/**
 * doGet
 * @param {any} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 * @see https://developers.google.com/apps-script/guides/web
 */
function doGet(e) {
  const reqParam = e.parameter;//パラメーターを取得
  // sheetLog(reqParam);
  switch (reqParam.action) {//actionパラメーターの内容によって処理を分岐
    case "getRecordList":
      {
        const after = parseInt(reqParam.after);
        const data = getRecordList(after);
        return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
      }
    case "getNameList":
      {
        const data = getNameList();
        return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
      }
    default:
      {
        return HtmlService.createTemplateFromFile('index').evaluate();
      }
  }
}

/**
 * Test doGet
 */
function testDoGet() {
  var e = {};
  e.parameter = { "after": "1712847600000", "action": "getRecordList" };
  doGet(e);
}


/**
 * doPost
 * @param {any} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 * @see https://developers.google.com/apps-script/guides/web
 */
function doPost(e) {
  const command = JSON.parse(e.postData.contents);
  switch (command.action) {
    case "recordID":
      {
        const record = [command.id];
        const recordedData = addRecord(record);
        const output = ContentService.createTextOutput();
        output.setContent(JSON.stringify(recordedData));
        output.setMimeType(ContentService.MimeType.JSON);
        return output;
      }
    case "updateName":
      {
        const result = updateName(command.id, command.name);
        const output = ContentService.createTextOutput();
        output.setContent(JSON.stringify(result));
        output.setMimeType(ContentService.MimeType.JSON);
        return output;
      }
    default:
      {
        sheetLog(e.postData.contents);
        break;
      }
  }
}

/**
 * Test doPost
 */
function testDoPost() {
  var e = {};
  e.postData = {};
  e.postData.contents = JSON.stringify({ "id": "id_xxx", "action": "recordID" });
  const output = doPost(e);
  console.log(output.getContent());
}

function getRecordList(after) {
  const recordSheet = activeSpreadSheet.getSheetByName('Record');
  const records = recordSheet.getDataRange().getValues();
  if (after) {
    const afterDate = new Date(after);
    const filteredData = records.filter(function (row) {
      const rowTimestamp = row[0];
      return rowTimestamp > afterDate;
    });
    return filteredData;
  }
  return records;
}

/**
 * Test getRecordList
 */
function testGetRecordList() {
  const testRecord1 = ['test1'];
  addRecord(testRecord1);
  const testRecord2 = ['test2'];
  addRecord(testRecord2);
  const after = new Date();
  after.setSeconds(after.getSeconds() - 10);
  const result = getRecordList(after.valueOf());
  if (result.length !== 2) console.error(result);
  if (result[0][1] !== 'test1') console.error(result);
  const recordSheet = activeSpreadSheet.getSheetByName('Record');
  const lastRow = recordSheet.getLastRow();
  recordSheet.deleteRow(lastRow);
  recordSheet.deleteRow(lastRow - 1);
  console.log('testGetRecordList() success!');
}

/**
 * Get name list
 * @returns {Array<Array<string>>} array of id and name
 */
function getNameList() {
  const nameListSheet = activeSpreadSheet.getSheetByName('NameList');
  const nameList = nameListSheet.getDataRange().getValues();
  return nameList;
}

/**
 * Add record
 * @param {Array<string>} record record data
 * @returns {Array<string>} recorded data with timestamp
 */
function addRecord(record) {
  const recordedData = [toDateTimeEntry(Date.now()), ...record];
  const recordSheet = activeSpreadSheet.getSheetByName('Record');
  recordSheet.appendRow(recordedData);
  return recordedData;
}

/**
 * Test addRecord
 */
function testAddRecord() {
  const testRecord = ['ID_xxxx'];
  addRecord(testRecord);
  const recordSheet = activeSpreadSheet.getSheetByName('Record');
  const records = recordSheet.getDataRange().getValues();
  const last = records[records.length - 1];
  if (last[1] !== testRecord[0]) {
    console.error(last);
  }
  const lastRow = recordSheet.getLastRow();
  recordSheet.deleteRow(lastRow);
  console.log('testAddRecord() success!');
}

/**
 * Update name entry
 * @param {string} id id
 * @param {string} newName new name
 * @returns {Object} updated data
 */
function updateName(id, newName) {
  const nameColumn = 2;
  const nameListSheet = activeSpreadSheet.getSheetByName('NameList');
  const nameList = nameListSheet.getDataRange().getValues();
  for (let i = 0; i < nameList.length; i++) {
    if (nameList[i][0] == id) {
      const cell = nameListSheet.getRange(i + 1, nameColumn);
      cell.setValue(newName);
      return {id: id, name: newName};
    }
  }
  nameListSheet.appendRow([id, newName]);
  return {id: id, name: newName};
}

/**
 * Test updateName
 */
function testUpdateName() {
  const addData = {id: 'id_xxx_1', name: 'added'};
  let result = updateName(addData.id, addData.name);
  const nameListSheet = activeSpreadSheet.getSheetByName('NameList');
  let nameList = nameListSheet.getDataRange().getValues();
  const added = nameList[nameList.length - 1];
  if (added[0] !== addData.id || added[1] !== addData.name) {
    console.error(result);
    return;
  }
  const updateData = {id: 'id_xxx_1', name: 'updated'};
  result = updateName(updateData.id, updateData.name);
  nameList = nameListSheet.getDataRange().getValues();
  const updated = nameList[nameList.length - 1];
  if (updated[0] !== updateData.id || updated[1] !== updateData.name) {
    console.error(result);
    return;
  }
  const lastRow = nameListSheet.getLastRow();
  nameListSheet.deleteRow(lastRow);
}
