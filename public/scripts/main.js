/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

// Signs-in Friendly Chat.
function signIn() {
  // TODO 1: Sign in Firebase with credential from the Google user.

  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);

}

// Signs-out of Friendly Chat.
function signOut() {
  // Sign out of Firebase.
  firebase.auth().signOut();

}

// Initiate firebase auth.
function initFirebaseAuth() {

  // Listen to auth state changes.
  firebase.auth().onAuthStateChanged(authStateObserver);
}

// Returns the signed-in user's profile Pic URL.
function getProfilePicUrl() {
  // TODO 4: Return the user's profile pic URL.

  return firebase.auth().currentUser.photoURL || '/images/profile_placeholder.png';
}

// Returns the signed-in user's display name.
function getUserName() {
  // TODO 5: Return the user's display name.

  return firebase.auth().currentUser.displayName;
}

// Returns true if a user is signed-in.
function isUserSignedIn() {
  // TODO 6: Return true if a user is signed-in.

  return !!firebase.auth().currentUser;

}

// Saves a new message on the Firebase DB.
function saveMessage(titleText, mainText) {
  // Add a new message entry to the Firebase database.
  return firebase.firestore().collection('notices').add({
    title: titleText,
    text: mainText,
    img: 'default',
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
    .then(function () {
      alert("공지사항을 등록하였습니다.");
    })
    .catch(function (error) {
      console.error('Error writing new message to Firebase Database', error);
      alert("업데이트에 에러가 발생했습니다!");
    });
}

function saveBanner(bannerText) {

  saveImageMessage(bannerText, globalFile);

}

// Saves a new message on the Firebase DB.
function savePoint(userText, pointText) {
  // 1. 사용자의 userNickname을 찾아서 uid값을 가져온다
  // 2. 사용자 uid에 대한 point collection에 값을 집어넣는다

  // Create a reference to the cities collection
  var customerRef = firebase.firestore().collection('customers');

  // Create a query against the collection.
  var query = customerRef.where("userNickname", "==", userText);

  var inputValue = parseInt(pointText);

  // 사용자 닉네임과 일치하는 쿼리를 진행한다.
  query
    .get()
    .then(function (querySnapshot) {

      querySnapshot.forEach(function (doc) {
        // doc.data() is never undefined for query doc snapshots
        console.log(doc.id, " => ", doc.data());

        // 문서의 key값과 점수를 받는다.
        var documentKey = doc.id;
        var documentValue = parseInt(doc.data().recentPoint);

        // 저장된 값보다 입력된값이 크면, 변경 아니면 변경하지않음
        // if (inputValue > documentValue) {
        // }

        // Set the "capital" field of the city 'DC'
        customerRef.doc(documentKey).update({
          recentPoint: inputValue
        })
          .then(function () {
            console.log("Document successfully updated!");
            console.log("사용자의 최고점수가 갱신됩니다.");
          })
          .catch(function (error) {
            // The document probably doesn't exist.
            console.error("Error updating document: ", error);
            alert("업데이트에 에러가 발생했습니다!");
          });


        var pointRef = customerRef.doc(documentKey).collection('points');

        return pointRef.add({
          point: inputValue,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
          .then(function () {
            console.log("Document successfully updated!");
            alert("사용자의 점수가 추가됩니다.");

          })
          .catch(function (error) {
            console.error('Error writing new message to Firebase Database', error);
            alert("업데이트에 에러가 발생했습니다!");
          });
      });
    })
    .catch(function (error) {
      console.log("Error getting documents: ", error);
      alert("업데이트에 에러가 발생했습니다!");
    });

  resetMaterialTextfield(messageInputUserElement);
  resetMaterialTextfield(messageInputPointElement);
  togglePointButton();

}

// Loads chat messages history and listens for upcoming ones.
function loadMessages() {
  // TODO 8: Load and listens for new messages.

  var query = firebase.firestore()
    .collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(12);

  query.onSnapshot(function (snapshot) {
    snapshot.docChanges().forEach(function (change) {
      if (change.type == 'removed') {
        deleteMessage(change.doc.id);
      } else {
        var message = change.doc.data();
        displayMessage(change.doc.id, message.timestamp, message.name, message.text, message.profilePicUrl, message.imageUrl);
      }
    });
  });
}

// Saves a new message containing an image in Firebase.
// This first saves the image in Firebase storage.
function saveImageMessage(data, file) {

  // 콜렉션 size를 받아오기
  var bannerRef = firebase.firestore().collection('banner');

  bannerRef.get()
    .then(function (querySnapshot) {

      var totalDoc = 1;

      querySnapshot.forEach(function(doc) {
        // doc.data() is never undefined for query doc snapshots

        totalDoc = totalDoc + 1;
        console.log(doc.id, " => ", doc.data());
      });

      bannerRef = bannerRef.doc(String(totalDoc));

      // 배너 콜렉션에 넣는다
      // 1 - We add a message with a loading icon that will get updated with the shared image.
      bannerRef.set({
        link: LOADING_IMAGE_URL,
        text: data
      }).then(function (ref) {
        // 2 - Upload the image to Cloud Storage.
        // var filePath = firebase.auth().currentUser.uid + '/' + messageRef.id + '/' + file.name;
        // 폴더이름은 이미지/파일명
        var filePath = 'image' + '/' + file.name;
        return firebase.storage().ref(filePath).put(file).then(function (fileSnapshot) {
          // 3 - Generate a public URL for the file.
          return fileSnapshot.ref.getDownloadURL().then((url) => {
            // 4 - Update the chat message placeholder with the image's URL.
            return bannerRef.update({
              link: url
              // storageUri: fileSnapshot.metadata.fullPath
            }).then(function () {
              // Clear message text field and re-enable the SEND button.
              console.log('배너가 추가됬습니다!');
              alert("배너가 추가됬습니다!");
            });
          });
        });
      }).catch(function (error) {
        console.error('There was an error uploading a file to Cloud Storage:', error);
      });


    })
    .catch(function (error) {
      console.log("Error getting documents: ", error);
    });



    resetMaterialTextfield(messageInputBannerElement);
    globalFile = null;
    toggleBannerButton();

}

// Saves the messaging device token to the datastore.
function saveMessagingDeviceToken() {
  // TODO 10: Save the device token in the realtime datastore
}

// Requests permissions to show notifications.
function requestNotificationsPermissions() {
  // TODO 11: Request permissions to send notifications.
}

// Triggered when a file is selected via the media picker.
function onMediaFileSelected(event) {
  event.preventDefault();
  var file = event.target.files[0];
  globalFile = event.target.files[0];

  // 초기화
  // Clear the selection in the file picker input.
  imageFormElement.reset();

  // 이미지파일인 경우
  // Check if the file is an image.
  if (!file.type.match('image.*')) {
    var data = {
      message: 'You can only share images',
      timeout: 2000
    };
    signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
    return;
  }
  // Check if the user is signed-in
  if (checkSignedInWithMessage()) {
    toggleBannerButton();
  }
}

// Triggered when the send new message form is submitted.
function onMessageFormSubmit(e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (messageInputTitleElement.value &&
    messageInputMainElement.value &&
    checkSignedInWithMessage()) {
    saveMessage(messageInputTitleElement.value, messageInputMainElement.value).then(function () {
      // Clear message text field and re-enable the SEND button.
      resetMaterialTextfield(messageInputTitleElement);
      resetMaterialTextfield(messageInputMainElement);
      toggleButton();
    });
  }
}

function onMessageFormPointSubmit(e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (messageInputUserElement.value &&
    messageInputPointElement.value &&
    checkSignedInWithMessage()) {
    savePoint(messageInputUserElement.value, messageInputPointElement.value).then(function () {
      // Clear message text field and re-enable the SEND button.

    });
  }
}

function onMessageFormBannerSubmit(e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (messageInputBannerElement.value &&
    checkSignedInWithMessage()) {
    saveBanner(messageInputBannerElement.value).then(function () {
      // Clear message text field and re-enable the SEND button.

    });
  }
}

// Triggers when the auth state change for instance when the user signs-in or signs-out.
function authStateObserver(user) {
  if (user) { // User is signed in!
    // Get the signed-in user's profile pic and name.
    var profilePicUrl = getProfilePicUrl();
    var userName = getUserName();

    // Set the user's profile pic and name.
    userPicElement.style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(profilePicUrl) + ')';
    userNameElement.textContent = userName;

    // Show user's profile and sign-out button.
    userNameElement.removeAttribute('hidden');
    userPicElement.removeAttribute('hidden');
    signOutButtonElement.removeAttribute('hidden');

    // Hide sign-in button.
    signInButtonElement.setAttribute('hidden', 'true');

    // We save the Firebase Messaging Device token and enable notifications.
    saveMessagingDeviceToken();
  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    userNameElement.setAttribute('hidden', 'true');
    userPicElement.setAttribute('hidden', 'true');
    signOutButtonElement.setAttribute('hidden', 'true');

    // Show sign-in button.
    signInButtonElement.removeAttribute('hidden');
  }
}

// Returns true if user is signed-in. Otherwise false and displays a message.
function checkSignedInWithMessage() {
  // Return true if the user is signed in Firebase
  if (isUserSignedIn()) {
    return true;
  }

  // Display a message to the user using a Toast.
  var data = {
    message: 'You must sign-in first',
    timeout: 2000
  };
  signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
  return false;
}

// Resets the given MaterialTextField.
function resetMaterialTextfield(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();

}

// Template for messages.
var MESSAGE_TEMPLATE =
  '<div class="message-container">' +
  '<div class="spacing"><div class="pic"></div></div>' +
  '<div class="message"></div>' +
  '<div class="name"></div>' +
  '</div>';

// Adds a size to Google Profile pics URLs.
function addSizeToGoogleProfilePic(url) {
  if (url.indexOf('googleusercontent.com') !== -1 && url.indexOf('?') === -1) {
    return url + '?sz=150';
  }
  return url;
}

// A loading image URL.
var LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif?a';

// Delete a Message from the UI.
function deleteMessage(id) {
  var div = document.getElementById(id);
  // If an element for that message exists we delete it.
  if (div) {
    div.parentNode.removeChild(div);
  }
}

// Displays a Message in the UI.
function displayMessage(id, timestamp, name, text, picUrl, imageUrl) {
  var div = document.getElementById(id);
  // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = MESSAGE_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', id);
    div.setAttribute('timestamp', timestamp);
    for (var i = 0; i < messageListElement.children.length; i++) {
      var child = messageListElement.children[i];
      var time = child.getAttribute('timestamp');
      if (time && time > timestamp) {
        break;
      }
    }
    messageListElement.insertBefore(div, child);
  }
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(picUrl) + ')';
  }
  div.querySelector('.name').textContent = name;
  var messageElement = div.querySelector('.message');
  if (text) { // If the message is text.
    messageElement.textContent = text;
    // Replace all line breaks by <br>.
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  } else if (imageUrl) { // If the message is an image.
    var image = document.createElement('img');
    image.addEventListener('load', function () {
      messageListElement.scrollTop = messageListElement.scrollHeight;
    });
    image.src = imageUrl + '&' + new Date().getTime();
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  // Show the card fading-in and scroll to view the new message.
  setTimeout(function () { div.classList.add('visible') }, 1);
  messageListElement.scrollTop = messageListElement.scrollHeight;
  messageInputTitleElement.focus();
  messageInputMainElement.focus();
}

// Enables or disables the submit button depending on the values of the input
// fields.
function toggleButton() {
  if (messageInputTitleElement.value && messageInputMainElement.value) {
    submitButtonNoticeElement.removeAttribute('disabled');
  } else {
    submitButtonNoticeElement.setAttribute('disabled', 'true');
  }
}

function togglePointButton() {
  if (messageInputUserElement.value && messageInputPointElement.value) {
    submitButtonPointElement.removeAttribute('disabled');
  } else {
    submitButtonPointElement.setAttribute('disabled', 'true');
  }
}


function toggleBannerButton() {

  var fileExisted = false;

  // 파일 업로드 됬으면 true
  if(globalFile != null) {
      fileExisted = true;
  }

  if (messageInputBannerElement.value && fileExisted) {
    submitButtonBannerElement.removeAttribute('disabled');
  } else {
    submitButtonBannerElement.setAttribute('disabled', 'true');
  }
}

// Checks that the Firebase SDK has been correctly setup and configured.
function checkSetup() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
      'Make sure you go through the codelab setup instructions and make ' +
      'sure you are running the codelab using `firebase serve`');
  }
}

// Checks that Firebase has been imported.
checkSetup();

// Shortcuts to DOM Elements.
// 공지사항 관련내용
var messageListElement = document.getElementById('messages');
var messageFormMessageElement = document.getElementById('message-form-notice');
var messageInputTitleElement = document.getElementById('message-title');
var messageInputMainElement = document.getElementById('message-main');

// 사용자 점수 관련내용
var messageFormPointElement = document.getElementById('message-form-point');
var messageInputUserElement = document.getElementById('message-user');
var messageInputPointElement = document.getElementById('message-point');

// 배너 등록하기
var messageFormBannerElement = document.getElementById('message-form-banner');
var messageInputBannerElement = document.getElementById('message-banner');

// 버튼
var submitButtonNoticeElement = document.getElementById('submit-notice');
var submitButtonPointElement = document.getElementById('submit-point');
var submitButtonBannerElement = document.getElementById('submit-banner');

// 이미지
var imageButtonElement = document.getElementById('submitImage');
var imageFormElement = document.getElementById('image-form');

var mediaCaptureElement = document.getElementById('mediaCapture');
var userPicElement = document.getElementById('user-pic');
var userNameElement = document.getElementById('user-name');
var signInButtonElement = document.getElementById('sign-in');
var signOutButtonElement = document.getElementById('sign-out');
var signInSnackbarElement = document.getElementById('must-signin-snackbar');

var globalFile = null;

// 폼으로 메세지를 저장 , 제출
// Saves message on form submit.
// messageFormMessageElement.addEventListener('submit', onMessageFormSubmit);
messageFormMessageElement.addEventListener('submit', onMessageFormSubmit);
messageFormPointElement.addEventListener('submit', onMessageFormPointSubmit);
messageFormBannerElement.addEventListener('submit', onMessageFormBannerSubmit);

signOutButtonElement.addEventListener('click', signOut);
signInButtonElement.addEventListener('click', signIn);

// Toggle for the button.
// messageInputElement.addEventListener('keyup', toggleButton);
// messageInputElement.addEventListener('change', toggleButton);

// 공지사항 제목 관련 listener
messageInputTitleElement.addEventListener('keyup', toggleButton);
messageInputTitleElement.addEventListener('change', toggleButton);
// 공지사항 내용 관련 listener
messageInputMainElement.addEventListener('keyup', toggleButton);
messageInputMainElement.addEventListener('change', toggleButton);

// 사용자 이름 관련 listener
messageInputPointElement.addEventListener('keyup', togglePointButton);
messageInputPointElement.addEventListener('change', togglePointButton);

// 사용자 점수 관련 listener
messageInputUserElement.addEventListener('keyup', togglePointButton);
messageInputUserElement.addEventListener('change', togglePointButton);

// 배너 텍스트 listener
messageInputBannerElement.addEventListener('keyup', toggleBannerButton);
messageInputBannerElement.addEventListener('change', toggleBannerButton);

// 이미지 업로드
// Events for image upload.
imageButtonElement.addEventListener('click', function (e) {
  e.preventDefault();
  mediaCaptureElement.click();
});
mediaCaptureElement.addEventListener('change', onMediaFileSelected);

// initialize Firebase
initFirebaseAuth();

// Remove the warning about timstamps change. 
var firestore = firebase.firestore();
var settings = { timestampsInSnapshots: true };
firestore.settings(settings);

// We load currently existing chat messages and listen to new ones.
// loadMessages();
