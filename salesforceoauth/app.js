window.app = {};

$(document).ready(function() {

    $('#additem').click(function (e) {
        createRecord();
    });

    function checkEnterKey(e, action) {
        if (e.keyCode == 13) {
            action();
        }
    }

    $('#loginDialog').find('input').keydown(function(e) {
        checkEnterKey(e, logIn);
    });
});

$(window).on("apiReady", function () {

    checkSession();
});

// session

function checkSession() {

    $("#loading").show();
    // check for existing session, relevant when code is hosted on the dsp
    window.df.apis.user.getSession({"body":{}}, function (response) {
        $("#loading").hide();
        // existing session found, assign session token
        // to be used for the session duration
        var session = new ApiKeyAuthorization("X-Dreamfactory-Session-Token",
            response.session_id, 'header');
        window.authorizations.add("X-DreamFactory-Session-Token", session);
        runApp();
    }, function (response) {
        $("#loading").hide();
        // no valid session, try to log in
        doLogInDialog();
    });
}

// main app entry point

function runApp() {

    // your app starts here
    getRecords();
}

// CRUD

var providerUrl = 'https://api.cloud.dreamfactory.com/portal/salesforce/data/v29.0/';

function getRecords() {

    $.ajax({
        dataType:'json',
        url: providerUrl + 'query?q=SELECT+Name,Id+FROM+Account+ORDER+BY+CreatedDate+DESC+LIMIT+5&dfpapikey=b5e9610f7d7170e5c6bb6d7c56014e5e',
        cache:false,
        success:function (response) {
            buildItemList(response);
        },
        error:function(xhr, status, thrown) {
            oauthError(xhr.responseText);
        }
    });
}

function createRecord() {

    var name = $('#itemname').val();
    if (name === '') return;
    var item = {"Name":name};
    $.ajax({
        dataType:'json',
        type : "POST",
        url: providerUrl + 'sobjects/Account?dfpapikey=b5e9610f7d7170e5c6bb6d7c56014e5e',
        data:JSON.stringify(item),
        cache:false,
        success:function (response) {
            getRecords();
        },
        error:function(xhr, status, thrown) {
            oauthError(xhr.responseText);
        }
    });
}

function deleteRecord(name, id) {

    if (confirm("Delete the account '" + name + "'?")) {
        $.ajax({
            dataType:'json',
            type : "DELETE",
            url: providerUrl + 'sobjects/Account/' + id + '?dfpapikey=b5e9610f7d7170e5c6bb6d7c56014e5e',
            cache:false,
            success:function (response) {
                getRecords();
            },
            error:function(xhr, status, thrown) {
                oauthError(xhr.responseText);
            }
        });
    }
}

// ui

function buildItemList(json) {

    console.log(json);
    var html = '';
    if (json.details.records) {
        json.details.records.forEach(function (entry) {
            var name = entry.Name;
            var id = entry.Id;
            html += '<tr>';
            html += '<td><a><i class="icon icon-minus-sign" data-id="' + id + '" data-name="' + name + '"></i></a></td>';
            if (entry.complete === true) {
                html += '<td style="width:100%" class="item strike" data-id="' + id + '">' + name + '</td>';
            } else {
                html += '<td style="width:100%" class="item" data-id="' + id + '">' + name + '</td>';
            }
            html += '</tr>';
        });
    }
    $('table').html(html);
    $('#list-container i').click(function (e) {
        var name = $(this).data('name');
        var id = $(this).data('id');
        deleteRecord(name, id);
    });
}

// error utils

function oauthError(responseText) {

    if (responseText) {
        try {
            var _data = JSON.parse(xhr.responseText);
            if (_data && _data.details) {
                if (_data.details.location) {
                    window.location = _data.details.location;
                } else {
                    if (_data.details.message) {
                        crudError(_data.details.message);
                    }
                }
            }
        }
        catch(err) {
            crudError();
        }
    } else {
        crudError();
    }
}

function getErrorString(response) {

    var msg = "An error occurred, but the server provided no additional information.";
    if (response.content && response.content.data && response.content.data.error) {
        msg = response.content.data.error[0].message;
    }
    msg = msg.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&apos;/g, '\'');
    return msg;
}

function crudError(msg) {

    if (!msg) {
        msg = "Uh oh. There was an error.";
    }
    alert(msg);
}

// login dialog

function clearLogIn() {

    var $_dlg = $('#loginDialog');
    $('input', $_dlg).val('');
}

function doLogInDialog() {

    var _message = 'Please enter your User Email and Password below to sign in.';
    $('#loginErrorMessage').removeClass('alert-error').empty().html(_message);
    clearLogIn();
    $("#loginDialog").modal('show').on('shown', function() {
        $('#UserEmail').focus();
    });
}

function logIn() {

    var email = $('#UserEmail').val();
    var pw = $('#Password').val();
    if (!email || !pw) {
        $("#loginErrorMessage").addClass('alert-error').html('You must enter your email address and password to continue.');
        return;
    }
    var body = {
        "email":email,
        "password":pw
    };
    $("#loading").show();
    window.df.apis.user.login({"body":body}, function (response) {
        // assign session token to be used for the session duration
        var session = new ApiKeyAuthorization("X-Dreamfactory-Session-Token",
            response.session_id, 'header');
        window.authorizations.add("X-DreamFactory-Session-Token", session);
        $("#loginDialog").modal('hide');
        $("#loading").hide();
        runApp();
    }, function (response) {
        $("#loading").hide();
        $("#loginErrorMessage").addClass('alert-error').html(getErrorString(response));
    });
}