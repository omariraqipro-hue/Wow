package com.omar.agent

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

class MainActivity : Activity() {

    private lateinit var keyInput: EditText
    private lateinit var goalInput: EditText
    private lateinit var statusText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences("agent", MODE_PRIVATE)

        keyInput = EditText(this).apply {
            hint = "Clé API Anthropic (sk-ant-...)"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setText(prefs.getString("api_key", ""))
        }
        goalInput = EditText(this).apply {
            hint = "Que dois-je faire ? Ex : active le mode sombre"
            minLines = 3
        }
        statusText = TextView(this).apply { textSize = 16f }

        val startButton = Button(this).apply {
            text = "Lancer"
            setOnClickListener { start() }
        }
        val stopButton = Button(this).apply {
            text = "Arrêter"
            setOnClickListener { AgentService.instance?.stop() }
        }
        val accessButton = Button(this).apply {
            text = "Activer l'accessibilité"
            setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
        }

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
            addView(TextView(context).apply { text = "Agent Tablette"; textSize = 26f })
            addView(keyInput, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
            addView(goalInput, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
            addView(startButton)
            addView(stopButton)
            addView(accessButton)
            addView(statusText)
        }
        setContentView(layout)
    }

    override fun onResume() {
        super.onResume()
        statusText.text = if (AgentService.instance == null) {
            "⚠️ Service d'accessibilité désactivé. Appuie sur « Activer l'accessibilité »."
        } else {
            AgentService.lastStatus
        }
    }

    private fun start() {
        val key = keyInput.text.toString().trim()
        val goal = goalInput.text.toString().trim()
        val service = AgentService.instance

        when {
            key.isEmpty() -> toast("Entre ta clé API.")
            goal.isEmpty() -> toast("Écris ce que je dois faire.")
            service == null -> toast("Active d'abord le service d'accessibilité.")
            else -> {
                getSharedPreferences("agent", MODE_PRIVATE).edit().putString("api_key", key).apply()
                service.runTask(key, goal)
            }
        }
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
}
