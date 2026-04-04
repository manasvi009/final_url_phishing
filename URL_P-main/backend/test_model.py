from app.model_service import predict_url

urls = [
    "https://google.com",
    "https://www.google.com/search?q=test",
    "https://github.com/openai/openai-python",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "http://paypal.com.secure-login-update.info/login",
    "http://192.168.1.100/login",
]

for u in urls:
    r = predict_url(u, threshold=0.5, debug=True)
    print("\nURL:", u)
    print("Label:", r["label"], "| Risk:", r["risk_score"])
    if "debug" in r:
        # show top hints only (not full feature row)
        print("Top feature hints:", r["debug"]["top_feature_hints"][:5])