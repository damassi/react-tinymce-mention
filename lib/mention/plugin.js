'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.initializePlugin = initializePlugin;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _domRemove = require('dom-remove');

var _domRemove2 = _interopRequireDefault(_domRemove);

var _lodashFindwhere = require('lodash.findwhere');

var _lodashFindwhere2 = _interopRequireDefault(_lodashFindwhere);

var _utilsGetKeyCode = require('./utils/getKeyCode');

var _utilsGetKeyCode2 = _interopRequireDefault(_utilsGetKeyCode);

var _utilsExtractMentions = require('./utils/extractMentions');

var _utilsExtractMentions2 = _interopRequireDefault(_utilsExtractMentions);

var _utilsTinyMCEUtils = require('./utils/tinyMCEUtils');

var _actionsMentionActions = require('./actions/mentionActions');

var keyMap = {
  BACKSPACE: 8,
  DELETE: 46,
  DOWN: 40,
  ENTER: 13,
  TAB: 9,
  UP: 38,
  ESC: 27
};

var defaultDelimiter = '@';
var delimiterOptions = ['#', '@'];

var delimiter = undefined,
    editor = undefined,
    store = undefined;

var focus = {
  active: false,

  toggle: function toggle() {
    this.active = !this.active;
    return this.active;
  }
};

/**
 * Tracks typed characters after `@ment|`.  Allows us to determine if we
 * are within a mention when `focus.active`
 */
var typedMention = {
  value: '',

  update: function update(str) {
    this.value = (this.value + str).trim();
    return this.value;
  },
  backspace: function backspace() {
    var val = this.value;
    this.value = val.substring(0, val.length - 1).trim();
    return this.value;
  },
  clear: function clear() {
    this.value = '';
  }
};

function initializePlugin(reduxStore, dataSource) {
  var delimiterValue = arguments.length <= 2 || arguments[2] === undefined ? defaultDelimiter : arguments[2];

  if (typeof window.tinymce === 'undefined') {
    throw new Error('Error initializing Mention plugin: `tinymce` is undefined.');
  }

  return new Promise(function (resolve, reject) {

    if (pluginInitialized()) {
      loadMentions(dataSource, resolve, reject);
    } else {
      window.tinymce.PluginManager.add('mention', function (activeEditor) {

        (0, _invariant2['default'])(reduxStore, 'Plugin must be initialized with a Redux store.');

        (0, _invariant2['default'])(dataSource, 'Plugin must be initialized with a `dataSource` that is an array or promise.');

        (0, _invariant2['default'])(isValidDelimiter(delimiterValue), 'Plugin must be initialized with a valid delimiter (' + delimiterOptions.toString() + ')');

        store = reduxStore;
        delimiter = delimiterValue;
        editor = activeEditor;

        loadMentions(dataSource, resolve, reject);
      });
    }
  });
}

function loadMentions(dataSource, resolve) {
  setTimeout(function () {
    if (typeof dataSource.then === 'function') {
      dataSource.then(function (response) {
        start();
        resolve({
          editor: editor,
          resolvedDataSource: response
        });
      });

      if (dataSource['catch'] === 'function') {
        dataSource['catch'](function (error) {
          throw new Error(error);
        });
      } else if (dataSource.fail === 'function') {
        dataSource.fail(function (error) {
          throw new Error(error);
        });
      }
    } else {
      start();
      resolve({
        editor: editor,
        resolvedDataSource: dataSource
      });
    }
  }, 100);
}

function start() {

  // FireFox fix
  setTimeout(function () {
    stop();

    editor.on('keypress', handleTopLevelEditorInput);
    editor.on('keydown', handleTopLevelActionKeys);
    editor.on('keyup', handleBackspace);
  }, 50);
}

function stop() {
  editor.off();
}

function handleTopLevelEditorInput(event) {
  var keyCode = (0, _utilsGetKeyCode2['default'])(event);
  var character = String.fromCharCode(keyCode);
  var foundDelimiter = delimiter.indexOf(character) > -1;

  normalizeEditorInput(editor);

  if (!focus.active && foundDelimiter) {
    startListeningForInput();
  } else if (!focus.active || character === ' ') {
    stopListeningAndCleanup();
  }
}

function handleTopLevelActionKeys(event) {
  var keyCode = (0, _utilsGetKeyCode2['default'])(event);

  if (focus.active && keyCode === keyMap.BACKSPACE || keyCode === keyMap.DELETE) {
    if ((0, _utilsTinyMCEUtils.getLastChar)(editor) === delimiter) {
      stopListeningAndCleanup();
    } else {
      var mentionText = updateMentionText(keyCode);
      store.dispatch((0, _actionsMentionActions.query)(mentionText));
    }
  }
}

function handleActionKeys(event) {
  var keyCode = (0, _utilsGetKeyCode2['default'])(event);

  if (isFetching(keyMap, keyCode, store) || shouldSelectOrMove(keyCode, event)) {
    event.preventDefault();
    return false;
  }
}

function handleKeyPress(event) {
  var keyCode = (0, _utilsGetKeyCode2['default'])(event);

  setTimeout(function () {
    var mentionText = updateMentionText(keyCode);

    if (mentionText !== '') {
      var content = editor.getContent();

      var _extractMentions = (0, _utilsExtractMentions2['default'])(content, delimiter);

      var mentions = _extractMentions.mentions;
      var prop = _extractMentions.prop;

      var mention = (0, _lodashFindwhere2['default'])(mentions, _defineProperty({}, prop, mentionText));

      if (mention) {
        store.dispatch((0, _actionsMentionActions.query)(mention[prop]));
      }
    }
  }, 0);
}

function handleBackspace(event) {
  var keyCode = (0, _utilsGetKeyCode2['default'])(event);
  var mentionClassName = '.tinymce-mention';
  var $ = window.tinymce.dom.DomQuery;

  if (keyCode === keyMap.BACKSPACE || keyCode === keyMap.DELETE) {
    var node = editor.selection.getNode();
    var foundMentionNode = $(node).closest(mentionClassName)[0];

    if (foundMentionNode) {
      var mention = removeMentionFromEditor(foundMentionNode);
      store.dispatch((0, _actionsMentionActions.remove)(mention));
    } else if (!editor.getContent({ format: 'html' }).trim().length) {
      store.dispatch((0, _actionsMentionActions.resetMentions)());
      stopListeningAndCleanup();
    } else {
      var mentionIds = (0, _utilsTinyMCEUtils.collectMentionIds)(editor, mentionClassName);
      store.dispatch((0, _actionsMentionActions.syncEditorState)(mentionIds));
    }
  }
}

function shouldSelectOrMove(keyCode, event) {
  var matchedSources = store.getState().mention.matchedSources;

  if (matchedSources.length) {
    if (keyCode === keyMap.BACKSPACE || keyCode === keyCode.DELETE) {
      typedMention.update(keyCode);
      return handleKeyPress(event);
    }

    switch (keyCode) {
      case keyMap.TAB:
        selectMention();
        return true;
      case keyMap.ENTER:
        selectMention();
        return true;
      case keyMap.DOWN:
        store.dispatch((0, _actionsMentionActions.moveDown)());
        return true;
      case keyMap.UP:
        store.dispatch((0, _actionsMentionActions.moveUp)());
        return true;
      case keyMap.ESC:
        stopListeningAndCleanup();
        return true;
      default:
        return false;
    }
  }
}

function startListeningForInput() {
  if (!focus.active) {
    focus.toggle();

    editor.on('keydown', handleActionKeys);
    editor.on('keypress', handleKeyPress);
  }
}

function stopListeningAndCleanup() {
  if (focus.active) {
    focus.toggle();

    typedMention.clear();
    store.dispatch((0, _actionsMentionActions.resetQuery)());

    editor.off('keydown', handleActionKeys);
    editor.off('keypress', handleKeyPress);
  }
}

function updateMentionText(keyCode) {
  var mentionText = keyCode !== keyMap.BACKSPACE && keyCode !== keyMap.DELETE ? typedMention.update((0, _utilsTinyMCEUtils.getLastChar)(editor)) : typedMention.backspace();

  return mentionText;
}

function selectMention() {
  store.dispatch((0, _actionsMentionActions.select)());
  typedMention.clear();
  stopListeningAndCleanup();
  return true;
}

function extractMentionFromNode(mentionNode, delimiter) {
  var re = new RegExp('(?:' + delimiter + '|_)');
  return mentionNode.innerHTML.replace(re, '').trim();
}

function removeMentionFromEditor(mentionNode) {
  (0, _domRemove2['default'])(mentionNode);
  return extractMentionFromNode(mentionNode, delimiter);
}

// TODO: Cleanup
// Force a root element in case one doesn't exist.
function normalizeEditorInput() {
  if (editor.getContent() === '' || editor.getContent({ format: 'raw' }) === '<br>') {
    editor.insertContent(' ');
  }
}

function pluginInitialized() {
  var ed = window.tinymce.activeEditor;
  var plugins = ed && ed.plugins;
  var mention = plugins && plugins.mention;
  return mention ? true : false;
}

function isValidDelimiter(delimiter) {
  return delimiterOptions.some(function (d) {
    return d === delimiter;
  });
}

function isFetching(keyMap, keyCode, store) {
  var fetching = store.getState().mention.fetching;

  var shouldCancelEvent = Object.keys(keyMap).some(function (key) {
    var actionKeyCode = keyMap[key];

    var inWhitelist = [keyMap.ESC, keyMap.BACKSPACE, keyMap.DELETE].some(function (k) {
      return k === actionKeyCode;
    });

    return fetching && actionKeyCode === keyCode && !inWhitelist ? true : false;
  });

  return shouldCancelEvent;
}

// Export methods for testing
var testExports = {
  _typedMention: typedMention,
  _focus: focus,
  _loadMentions: loadMentions,
  _shouldSelectOrMove: shouldSelectOrMove,
  _updateMentionText: updateMentionText,
  _normalizeEditorInput: normalizeEditorInput,
  _isValidDelimiter: isValidDelimiter,

  _handleKeyPress: handleKeyPress,
  _handleEditorBackspace: handleBackspace,
  _removeMentionFromEditor: removeMentionFromEditor,
  _extractMentionFromNode: extractMentionFromNode
};
exports.testExports = testExports;