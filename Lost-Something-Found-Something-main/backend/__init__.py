import os
from datetime import datetime
from flask import Flask, request, jsonify, render_template, redirect, url_for, flash, abort
from flask_login import (
    LoginManager, login_user, logout_user, login_required, current_user,
)
from werkzeug.utils import secure_filename

from .config import Config
from .models import db, User, Item, Claim

login_manager = LoginManager()
login_manager.login_view = "login_page"


def create_app():
    app = Flask(
        __name__,
        template_folder=os.path.join(os.path.dirname(__file__), "..", "frontend", "templates"),
        static_folder=os.path.join(os.path.dirname(__file__), "..", "frontend", "static"),
    )
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    with app.app_context():
        db.create_all()

    # ---------- helpers ----------
    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    def allowed_file(filename):
        return "." in filename and filename.rsplit(".", 1)[1].lower() in app.config["ALLOWED_EXTENSIONS"]

    def admin_required(fn):
        from functools import wraps

        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not current_user.is_authenticated or not current_user.is_admin:
                return jsonify({"error": "admin access required"}), 403
            return fn(*args, **kwargs)
        return wrapper

    def can_view_item(item):
        """Approved items are public. Pending/rejected: only owner and admin."""
        if item.approval == "approved":
            return True
        if not current_user.is_authenticated:
            return False
        return current_user.is_admin or item.user_id == current_user.id

    # ---------- page routes ----------
    @app.route("/")
    def index():
        recent = (
            Item.query.filter_by(status="open", approval="approved")
            .order_by(Item.created_at.desc())
            .limit(6)
            .all()
        )
        return render_template("index.html", recent=recent)

    @app.route("/items")
    def items_page():
        return render_template("items.html")

    @app.route("/items/<int:item_id>")
    def item_details_page(item_id):
        item = Item.query.get_or_404(item_id)
        if not can_view_item(item):
            abort(404)
        return render_template("item-details.html", item=item)

    @app.route("/report-lost")
    @login_required
    def report_lost_page():
        return render_template("report-lost.html")

    @app.route("/report-found")
    @login_required
    def report_found_page():
        return render_template("report-found.html")

    @app.route("/items/<int:item_id>/claim")
    @login_required
    def claim_page(item_id):
        item = Item.query.get_or_404(item_id)
        if item.approval != "approved":
            abort(404)
        return render_template("claim.html", item=item)

    @app.route("/login")
    def login_page():
        return render_template("login.html")

    @app.route("/register")
    def register_page():
        return render_template("register.html")

    @app.route("/dashboard")
    @login_required
    def dashboard_page():
        return render_template("dashboard.html")

    @app.route("/admin")
    @login_required
    def admin_page():
        if not current_user.is_admin:
            return redirect(url_for("index"))
        return render_template("admin.html")

    # ---------- auth API ----------
    @app.route("/api/register", methods=["POST"])
    def api_register():
        data = request.get_json(silent=True) or request.form
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not name or not email or len(password) < 6:
            return jsonify({"error": "name, valid email, and a password of 6+ chars are required"}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "an account with that email already exists"}), 409

        user = User(name=name, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        login_user(user)
        return jsonify({"message": "registered", "user": {"id": user.id, "name": user.name}}), 201

    @app.route("/api/login", methods=["POST"])
    def api_login():
        data = request.get_json(silent=True) or request.form
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({"error": "invalid email or password"}), 401

        login_user(user)
        return jsonify({"message": "logged in", "user": {"id": user.id, "name": user.name, "is_admin": user.is_admin}})

    @app.route("/api/logout", methods=["POST"])
    @login_required
    def api_logout():
        logout_user()
        return jsonify({"message": "logged out"})

    @app.route("/api/me")
    def api_me():
        if not current_user.is_authenticated:
            return jsonify({"user": None})
        return jsonify({"user": {"id": current_user.id, "name": current_user.name, "is_admin": current_user.is_admin}})

    # ---------- items API ----------
    @app.route("/api/items", methods=["GET"])
    def api_items_list():
        # public list: approved items only
        q = Item.query.filter_by(approval="approved")
        item_type = request.args.get("type")
        category = request.args.get("category")
        search = request.args.get("q")
        status = request.args.get("status", "open")

        if item_type in ("lost", "found"):
            q = q.filter_by(type=item_type)
        if category:
            q = q.filter_by(category=category)
        if status:
            q = q.filter_by(status=status)
        if search:
            like = f"%{search}%"
            q = q.filter(db.or_(Item.title.ilike(like), Item.description.ilike(like), Item.location.ilike(like)))

        items = q.order_by(Item.created_at.desc()).all()
        return jsonify({"items": [i.to_dict() for i in items]})

    @app.route("/api/items/<int:item_id>", methods=["GET"])
    def api_item_get(item_id):
        item = Item.query.get_or_404(item_id)
        if not can_view_item(item):
            return jsonify({"error": "not found"}), 404
        return jsonify({"item": item.to_dict()})

    @app.route("/api/items", methods=["POST"])
    @login_required
    def api_item_create():
        item_type = request.form.get("type") or (request.get_json(silent=True) or {}).get("type")
        if item_type not in ("lost", "found"):
            return jsonify({"error": "type must be 'lost' or 'found'"}), 400

        data = request.form if request.form else (request.get_json(silent=True) or {})
        title = (data.get("title") or "").strip()
        if not title:
            return jsonify({"error": "title is required"}), 400

        image_url = None
        if "image" in request.files:
            file = request.files["image"]
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(f"{datetime.utcnow().timestamp()}_{file.filename}")
                file.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))
                image_url = f"/static/uploads/{filename}"

        date_occurred = None
        if data.get("date_occurred"):
            try:
                date_occurred = datetime.strptime(data["date_occurred"], "%Y-%m-%d").date()
            except ValueError:
                pass

        item = Item(
            user_id=current_user.id,
            type=item_type,
            title=title,
            description=data.get("description"),
            category=data.get("category"),
            location=data.get("location"),
            date_occurred=date_occurred,
            image_url=image_url,
            approval="pending",  # admin must approve before it is public
        )
        db.session.add(item)
        db.session.commit()
        return jsonify({"message": "item submitted for admin approval", "item": item.to_dict()}), 201

    @app.route("/api/items/<int:item_id>", methods=["PUT"])
    @login_required
    def api_item_update(item_id):
        item = Item.query.get_or_404(item_id)
        if item.user_id != current_user.id and not current_user.is_admin:
            return jsonify({"error": "not authorized to edit this item"}), 403

        data = request.get_json(silent=True) or request.form
        for field in ("title", "description", "category", "location", "status"):
            if field in data:
                setattr(item, field, data[field])
        db.session.commit()
        return jsonify({"message": "item updated", "item": item.to_dict()})

    @app.route("/api/items/<int:item_id>", methods=["DELETE"])
    @login_required
    def api_item_delete(item_id):
        item = Item.query.get_or_404(item_id)
        if item.user_id != current_user.id and not current_user.is_admin:
            return jsonify({"error": "not authorized to delete this item"}), 403
        db.session.delete(item)
        db.session.commit()
        return jsonify({"message": "item deleted"})

    # ---------- claims API ----------
    @app.route("/api/items/<int:item_id>/claims", methods=["POST"])
    @login_required
    def api_claim_create(item_id):
        item = Item.query.get_or_404(item_id)
        if item.approval != "approved":
            return jsonify({"error": "this item is not approved yet"}), 400
        if item.user_id == current_user.id:
            return jsonify({"error": "you cannot claim your own item"}), 400

        data = request.get_json(silent=True) or request.form
        message = (data.get("message") or "").strip()
        if not message:
            return jsonify({"error": "a message describing your claim is required"}), 400

        claim = Claim(
            item_id=item.id,
            claimant_id=current_user.id,
            message=message,
            proof_details=data.get("proof_details"),
        )
        item.status = "claimed"
        db.session.add(claim)
        db.session.commit()
        return jsonify({"message": "claim submitted", "claim": claim.to_dict()}), 201

    # ---------- dashboard API ----------
    @app.route("/api/dashboard")
    @login_required
    def api_dashboard():
        my_items = Item.query.filter_by(user_id=current_user.id).order_by(Item.created_at.desc()).all()
        my_claims = Claim.query.filter_by(claimant_id=current_user.id).order_by(Claim.created_at.desc()).all()
        return jsonify({
            "items": [i.to_dict() for i in my_items],
            "claims": [c.to_dict() for c in my_claims],
        })

    # ---------- admin API ----------
    @app.route("/api/admin/items")
    @admin_required
    def api_admin_items():
        items = Item.query.order_by(Item.created_at.desc()).all()
        return jsonify({"items": [i.to_dict() for i in items]})

    @app.route("/api/admin/items/<int:item_id>/approve", methods=["POST"])
    @admin_required
    def api_admin_item_approve(item_id):
        item = Item.query.get_or_404(item_id)
        item.approval = "approved"
        db.session.commit()
        return jsonify({"message": "item approved", "item": item.to_dict()})

    @app.route("/api/admin/items/<int:item_id>/reject", methods=["POST"])
    @admin_required
    def api_admin_item_reject(item_id):
        item = Item.query.get_or_404(item_id)
        item.approval = "rejected"
        db.session.commit()
        return jsonify({"message": "item rejected", "item": item.to_dict()})

    @app.route("/api/admin/claims")
    @admin_required
    def api_admin_claims():
        claims = Claim.query.order_by(Claim.created_at.desc()).all()
        return jsonify({"claims": [c.to_dict() for c in claims]})

    @app.route("/api/admin/claims/<int:claim_id>/approve", methods=["POST"])
    @admin_required
    def api_admin_claim_approve(claim_id):
        claim = Claim.query.get_or_404(claim_id)
        claim.status = "approved"
        claim.item.status = "resolved"
        db.session.commit()
        return jsonify({"message": "claim approved", "claim": claim.to_dict()})

    @app.route("/api/admin/claims/<int:claim_id>/reject", methods=["POST"])
    @admin_required
    def api_admin_claim_reject(claim_id):
        claim = Claim.query.get_or_404(claim_id)
        claim.status = "rejected"
        claim.item.status = "open"
        db.session.commit()
        return jsonify({"message": "claim rejected", "claim": claim.to_dict()})

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith("/api/"):
            return jsonify({"error": "not found"}), 404
        return render_template("index.html", recent=[]), 404

    return app