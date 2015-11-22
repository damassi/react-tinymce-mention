'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.getLastChar = getLastChar;
exports.collectMentionIds = collectMentionIds;

function getLastChar(editor) {
  var negativeIndex = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];

  var start = editor.selection.getRng(true).startOffset;
  var text = editor.selection.getRng(true).startContainer.data || '';
  var character = text.substr(start - negativeIndex, 1);
  return character;
}

function collectMentionIds(editor, mentionClassName) {
  var mentions = editor.dom.select(mentionClassName).map(function (mentionNode) {
    return mentionNode.id;
  });

  return mentions;
}