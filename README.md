Blackjack w/ Websockets
=================

Once you run server.js on an node instance, you can hit up the /blackjack endpoint via a websocket to begin looking for a match.

Find a match as player "Cooldude"

```
{
  "type": "Find",
  "name": "Cooldude"
}
```
This will return a message containing your client's `playerId` as well as the UUID which identifies the game you are connected to.

Hit or Stand by sending messages with the format:

```
{
  "type": "Action",
  "action": "Stand",
  "uuid": "YOUR-UUID-HERE",
  "playerId": yourPlayerId
}
```

```
{
  "type": "Action",
  "action": "Hit",
  "uuid": "YOUR-UUID-HERE",
  "playerId": yourPlayerId
}
```
