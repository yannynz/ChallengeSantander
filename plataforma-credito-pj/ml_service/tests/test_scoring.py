from scoring import calcular_score

def test_dummy_score():
    features = {"vl_fatu": 100000, "vl_sldo": 50000, "idade": 5}
    score, modelo = calcular_score(features, modelo="rf")
    assert isinstance(score, float)
    assert 0.0 <= score <= 1.0
    assert modelo in ["RandomForest", "XGBoost", "dummy"]
