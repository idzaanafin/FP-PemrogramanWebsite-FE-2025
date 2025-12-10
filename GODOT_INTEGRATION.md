# Godot Game Integration Guide

## Overview
Halaman web akan mengirim data game (pertanyaan dan jawaban) ke Godot game melalui `postMessage` API. Godot perlu mendengarkan message tersebut dan mengirim balik response saat ada interaksi.

## Message Flow

### 1. Dari Web ke Godot

Ketika game loaded, web akan mengirim data game:

```javascript
{
  type: "GAME_DATA",
  payload: {
    id: "game-id",
    name: "Game Name",
    description: "Game Description",
    scorePerQuestion: 10,
    mapId: "1",
    countdown: 10,
    questions: [
      {
        questionText: "Question 1?",
        questionIndex: 0,
        answers: [
          {
            answerText: "Answer 1",
            answerIndex: 0
          },
          {
            answerText: "Answer 2",
            answerIndex: 1
          },
          {
            answerText: "Answer 3",
            answerIndex: 2
          },
          {
            answerText: "Answer 4",
            answerIndex: 3
          }
        ]
      }
    ]
  }
}
```

### 2. Dari Godot ke Web

#### a. Ketika Godot Ready
```javascript
{
  type: "GODOT_READY",
  payload: {}
}
```

#### b. Ketika Player Submit Jawaban
```javascript
{
  type: "ANSWER_SUBMITTED",
  payload: {
    questionIndex: 0,
    answerIndex: 1,
    isCorrect: true // atau false
  }
}
```

#### c. Ketika Request Pertanyaan Berikutnya
```javascript
{
  type: "REQUEST_NEXT_QUESTION",
  payload: {
    questionIndex: 1
  }
}
```

#### d. Ketika Game Selesai
```javascript
{
  type: "GAME_COMPLETED",
  payload: {
    score: 100,
    totalQuestions: 10,
    correctAnswers: 8
  }
}
```

## Implementation di Godot (GDScript)

### 1. Receive Messages dari Web

```gdscript
extends Node

var game_data = {}
var current_question_index = 0

func _ready():
    # Listen untuk messages dari JavaScript
    JavaScript.eval("""
        window.addEventListener('message', function(event) {
            if (event.data.type === 'GAME_DATA') {
                godot.receive_game_data(JSON.stringify(event.data.payload));
            }
        });
    """)
    
    # Beritahu web bahwa Godot sudah ready
    send_message_to_web("GODOT_READY", {})

func receive_game_data(json_string):
    var json = JSON.new()
    var error = json.parse(json_string)
    if error == OK:
        game_data = json.data
        print("Game data received: ", game_data)
        # Load pertanyaan pertama
        load_question(0)
    else:
        print("JSON Parse Error: ", json.get_error_message())
```

### 2. Send Messages ke Web

```gdscript
func send_message_to_web(type: String, payload: Dictionary):
    var message = {
        "type": type,
        "payload": payload
    }
    var json_string = JSON.stringify(message)
    
    JavaScript.eval("""
        window.parent.postMessage(%s, '*');
    """ % json_string)

func on_answer_selected(answer_index: int):
    # Cek apakah jawaban benar (sesuaikan dengan logic game kamu)
    var is_correct = check_answer(current_question_index, answer_index)
    
    # Kirim hasil ke web
    send_message_to_web("ANSWER_SUBMITTED", {
        "questionIndex": current_question_index,
        "answerIndex": answer_index,
        "isCorrect": is_correct
    })
    
    # Minta pertanyaan berikutnya jika masih ada
    current_question_index += 1
    if current_question_index < game_data.questions.size():
        load_question(current_question_index)
    else:
        # Game selesai
        on_game_completed()

func on_game_completed():
    send_message_to_web("GAME_COMPLETED", {
        "score": calculate_total_score(),
        "totalQuestions": game_data.questions.size(),
        "correctAnswers": count_correct_answers()
    })
```

### 3. Display Question & Answers

```gdscript
func load_question(index: int):
    if index >= game_data.questions.size():
        return
    
    var question = game_data.questions[index]
    
    # Update UI dengan pertanyaan
    $QuestionLabel.text = question.questionText
    
    # Update UI dengan jawaban
    for i in range(question.answers.size()):
        var answer = question.answers[i]
        var button = get_node("AnswerButton" + str(i))
        button.text = answer.answerText
        button.connect("pressed", self, "on_answer_selected", [answer.answerIndex])
```

## Example UI Setup di Godot

Buat UI elements:
- `Label` untuk question text
- `Button` (4x) untuk answer options
- `Label` untuk score display
- `Label` untuk countdown timer

## Testing

1. Export Godot game ke HTML5
2. Pastikan file export ada di `public/game/`
3. Buka `/maze-chase/godot/:id` di browser
4. Cek console browser untuk melihat message flow
5. Test interaction antara Godot dan web

## Notes

- Gunakan `JavaScript.eval()` untuk komunikasi di Godot HTML5 export
- Pastikan CORS headers sudah di-set di Vite config
- Data pertanyaan sudah include jawaban yang benar di response API
- Handle case ketika player tidak menjawab (timeout)
