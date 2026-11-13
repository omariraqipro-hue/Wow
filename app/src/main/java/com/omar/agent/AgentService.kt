package com.omar.agent

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.graphics.Rect
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Lit l'écran (arbre d'accessibilité), demande à Claude la prochaine action,
 * l'exécute, et recommence jusqu'à ce que l'objectif soit atteint.
 */
class AgentService : AccessibilityService() {

    companion object {
        var instance: AgentService? = null
        var lastStatus = "Prêt."
        private const val MAX_STEPS = 30
        private const val MAX_NODES = 300
        private const val MODEL = "claude-sonnet-5-5"

        private val SYSTEM_PROMPT = """
Tu contrôles une tablette Samsung Galaxy Tab S7 (Android, One UI) pour réaliser l'objectif de l'utilisateur.
À chaque tour tu reçois la liste des éléments visibles de l'écran, numérotés [id].
Réponds UNIQUEMENT avec un objet JSON contenant UNE seule action parmi :
{"action":"click","id":N,"reason":"..."}
{"action":"type","id":N,"text":"...","reason":"..."}
{"action":"scroll","id":N,"direction":"forward ou backward","reason":"..."}
{"action":"back","reason":"..."}
{"action":"home","reason":"..."}
{"action":"open_settings","reason":"..."}
{"action":"open_app","name":"nom de l'application","reason":"..."}
{"action":"done","message":"résumé court pour l'utilisateur"}
Règles :
- "reason" est une phrase courte en français.
- Si une action a échoué, essaie autre chose au lieu de la répéter.
- Pour trouver un réglage, la barre de recherche des Paramètres est souvent le plus rapide.
- Ne fais jamais d'achat, de paiement, de suppression de données, de réinitialisation ni d'envoi de message si l'objectif ne le demande pas explicitement. Dans le doute, réponds "done" et explique.
- Quand l'objectif est atteint ou impossible, réponds "done".
""".trim()
    }

    @Volatile private var running = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private val nodes = mutableListOf<AccessibilityNodeInfo>()

    override fun onServiceConnected() {
        instance = this
    }

    override fun onDestroy() {
        instance = null
        super.onDestroy()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}

    override fun onInterrupt() {}

    fun stop() {
        running = false
        status("Arrêté.")
    }

    fun runTask(apiKey: String, goal: String) {
        if (running) {
            status("Une tâche est déjà en cours.")
            return
        }
        running = true
        status("C'est parti : $goal")
        performGlobalAction(GLOBAL_ACTION_HOME) // quitte l'appli pour libérer l'écran
        Thread {
            try {
                loop(apiKey, goal)
            } catch (e: Exception) {
                status("Erreur : ${e.message}")
            } finally {
                running = false
            }
        }.start()
    }

    private fun loop(apiKey: String, goal: String) {
        val history = mutableListOf<String>()
        for (step in 1..MAX_STEPS) {
            Thread.sleep(1500) // laisse l'écran se mettre à jour
            if (!running) return

            val action = askClaude(apiKey, goal, history, describeScreen())
            if (!running) return

            if (action.optString("action") == "done") {
                status("✅ " + action.optString("message", "Terminé."))
                return
            }
            val result = execute(action)
            history.add("$step. $action -> $result")
            status("Étape $step : " + action.optString("reason"))
        }
        status("Arrêté : trop d'étapes ($MAX_STEPS).")
    }

    // ---------- Lecture de l'écran ----------

    private fun describeScreen(): String {
        nodes.clear()
        val root = rootInActiveWindow ?: return "(écran illisible)"
        val sb = StringBuilder("Application : ${root.packageName}\n")
        walk(root, 0, sb)
        return sb.toString()
    }

    private fun walk(node: AccessibilityNodeInfo, depth: Int, sb: StringBuilder) {
        if (nodes.size >= MAX_NODES || depth > 40) return

        val text = (node.text ?: node.contentDescription ?: "").toString().replace('\n', ' ').take(80)
        val flags = buildString {
            if (node.isClickable) append(" [cliquable]")
            if (node.isEditable) append(" [champ texte]")
            if (node.isScrollable) append(" [défilable]")
            if (node.isCheckable) append(if (node.isChecked) " [activé]" else " [désactivé]")
        }
        if (node.isVisibleToUser && (text.isNotEmpty() || flags.isNotEmpty())) {
            nodes.add(node)
            val type = node.className?.toString()?.substringAfterLast('.') ?: "?"
            sb.append("[${nodes.size - 1}] $type \"$text\"$flags\n")
        }
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { walk(it, depth + 1, sb) }
        }
    }

    // ---------- Actions ----------

    private fun execute(a: JSONObject): String {
        val node = nodes.getOrNull(a.optInt("id", -1))
        return when (a.optString("action")) {
            "click" -> if (node != null && click(node)) "ok" else "échec"
            "type" -> {
                val args = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, a.optString("text"))
                }
                if (node?.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args) == true) "ok" else "échec"
            }
            "scroll" -> {
                val act = if (a.optString("direction") == "backward") {
                    AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
                } else {
                    AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
                }
                if (node?.performAction(act) == true) "ok" else "échec"
            }
            "back" -> if (performGlobalAction(GLOBAL_ACTION_BACK)) "ok" else "échec"
            "home" -> if (performGlobalAction(GLOBAL_ACTION_HOME)) "ok" else "échec"
            "open_settings" -> {
                startActivity(Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                "ok"
            }
            "open_app" -> openApp(a.optString("name"))
            else -> "action inconnue"
        }
    }

    private fun click(node: AccessibilityNodeInfo): Boolean {
        // 1) clic d'accessibilité sur l'élément ou son premier parent cliquable
        var n: AccessibilityNodeInfo? = node
        while (n != null) {
            if (n.isClickable && n.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true
            n = n.parent
        }
        // 2) sinon, appui « doigt » au centre de l'élément
        val r = Rect()
        node.getBoundsInScreen(r)
        val path = Path().apply { moveTo(r.exactCenterX(), r.exactCenterY()) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 60))
            .build()
        return dispatchGesture(gesture, null, null)
    }

    private fun openApp(name: String): String {
        val pm = packageManager
        val apps = pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
        val app = apps.firstOrNull { it.loadLabel(pm).toString().equals(name, ignoreCase = true) }
            ?: apps.firstOrNull { it.loadLabel(pm).toString().contains(name, ignoreCase = true) }
            ?: return "application introuvable"
        val launch = pm.getLaunchIntentForPackage(app.activityInfo.packageName) ?: return "échec"
        startActivity(launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        return "ok"
    }

    // ---------- Claude ----------

    private fun askClaude(apiKey: String, goal: String, history: List<String>, screen: String): JSONObject {
        val prompt = buildString {
            append("Objectif : ").append(goal).append("\n\n")
            append("Actions déjà faites :\n")
            append(if (history.isEmpty()) "aucune" else history.joinToString("\n")).append("\n\n")
            append("Écran actuel :\n").append(screen)
        }
        val body = JSONObject()
            .put("model", MODEL)
            .put("max_tokens", 400)
            .put("system", SYSTEM_PROMPT)
            .put("messages", JSONArray().put(JSONObject().put("role", "user").put("content", prompt)))

        val conn = URL("https://api.anthropic.com/v1/messages").openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.connectTimeout = 20_000
        conn.readTimeout = 60_000
        conn.setRequestProperty("content-type", "application/json")
        conn.setRequestProperty("x-api-key", apiKey)
        conn.setRequestProperty("anthropic-version", "2023-06-01")
        conn.outputStream.use { it.write(body.toString().toByteArray()) }

        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        val response = stream.bufferedReader().use { it.readText() }
        if (code !in 200..299) throw Exception("API $code : ${response.take(200)}")

        val text = JSONObject(response).getJSONArray("content").getJSONObject(0).getString("text")
        val start = text.indexOf('{')
        val end = text.lastIndexOf('}')
        if (start < 0 || end < start) throw Exception("réponse illisible : ${text.take(100)}")
        return JSONObject(text.substring(start, end + 1))
    }

    private fun status(msg: String) {
        lastStatus = msg
        mainHandler.post { Toast.makeText(this, msg, Toast.LENGTH_SHORT).show() }
    }
}
