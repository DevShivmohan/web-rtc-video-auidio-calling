
// JavaScript Logic (app.js)
let userId, peerId, webSocket;
let peerConnection;

const form = document.getElementById("userForm");
const callButton = document.getElementById("callButton");
const incomingCallDiv = document.getElementById("incomingCall");
const callerIdSpan = document.getElementById("callerId");
const acceptCallButton = document.getElementById("acceptCall");
const rejectCallButton = document.getElementById("rejectCall");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

form.addEventListener("submit", (e) => {
    e.preventDefault();
    userId = document.getElementById("userId").value;
    peerId = document.getElementById("peerId").value;
    startWebSocket();
});

function startWebSocket() {
    webSocket = new WebSocket("ws://localhost:8080/ws");

    webSocket.onopen = () => {
        webSocket.send(JSON.stringify({ type: "register", userId: userId }));
        callButton.disabled = false;
    };

    webSocket.onmessage = (message) => {
        const data = JSON.parse(message.data);
        switch (data.type) {
            case "call":
                handleIncomingCall(data.from);
                break;
            case "response":
                handleCallResponse(data);
                break;
            case "offer":
                handleOffer(data.offer);
                break;
            case "answer":
                handleAnswer(data.answer);
                break;
            case "candidate":
                handleCandidate(data.candidate);
                break;
        }
    };
}

callButton.addEventListener("click", () => {
    webSocket.send(JSON.stringify({ type: "call", from: userId, to: peerId }));
});

function handleIncomingCall(from) {
    incomingCallDiv.style.display = "block";
    callerIdSpan.innerText = from;

    acceptCallButton.onclick = () => {
        webSocket.send(JSON.stringify({ type: "response", to: from, status: "accepted" }));
        startCall();
        incomingCallDiv.style.display = "none";
    };

    rejectCallButton.onclick = () => {
        webSocket.send(JSON.stringify({ type: "response", to: from, status: "rejected" }));
        incomingCallDiv.style.display = "none";
    };
}

function handleCallResponse(data) {
    if (data.status === "accepted") {
        console.log("Call accepted!");
        startCall();
    } else if (data.status === "rejected") {
        alert("Call rejected by the peer.");
    }
}

function startCall() {
    peerConnection = createPeerConnection();

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
            localVideo.srcObject = stream;
            stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

            peerConnection.createOffer()
                .then((offer) => {
                    peerConnection.setLocalDescription(offer);
                    webSocket.send(JSON.stringify({ type: "offer", offer: offer, to: peerId }));
                });
        });
}

function createPeerConnection() {
    const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            webSocket.send(JSON.stringify({ type: "candidate", candidate: event.candidate, to: peerId }));
        }
    };

    pc.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    return pc;
}

function handleOffer(offer) {
    peerConnection = createPeerConnection();
    // Ensure we're in the right state before setting the remote offer
    console.log("Setting remote description with offer...");
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => {
            console.log("Remote description set successfully, creating answer...");
            return peerConnection.createAnswer();
        })
        .then((answer) => {
            console.log("Answer created:", answer);
            return peerConnection.setLocalDescription(answer);
        })
        .then(() => {
            console.log("Local description set, sending answer...");
            webSocket.send(JSON.stringify({ type: "answer", answer: peerConnection.localDescription, to: userId }));
        })
        .catch((error) => {
            console.error("Error in offer-answer flow", error);
        });

}


function handleAnswer(answer) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        .catch((error) => {
            console.error("Error setting remote description", error);
        });
}

function handleCandidate(candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}
