#!/usr/bin/env python3
"""Foundry agent deployment helper for InsightForge.

This script provides a safe starting point for plan/export automation:
- Reads declarative agent config from tools/foundry/config/agents.<env>.yaml
- Validates instruction files and required config
- Exports configuration artifacts for infra and backend

Note: live upsert/create calls to Foundry can be added in the `apply` command.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
from pathlib import Path
from typing import Any


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _resolve_config_path(root: Path, env: str, config_path: str | None) -> Path:
    if config_path:
        return Path(config_path).resolve()

    return root / "tools" / "foundry" / "config" / f"agents.{env}.yaml"


def _load_yaml(path: Path) -> dict[str, Any]:
    try:
        import yaml  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "PyYAML no esta instalado. Ejecuta: pip install pyyaml"
        ) from exc

    if not path.exists():
        raise FileNotFoundError(f"No existe el archivo de configuracion: {path}")

    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    if not isinstance(data, dict):
        raise ValueError("La configuracion YAML debe ser un objeto en raiz.")

    return data


def _apply_overrides(config: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    if getattr(args, "project_endpoint", None):
        config["projectEndpoint"] = args.project_endpoint

    if getattr(args, "model_deployment", None):
        config["modelDeployment"] = args.model_deployment

    if getattr(args, "environment_name", None):
        config["environment"] = args.environment_name

    return config


def _read_text(path: Path) -> str:
    with path.open("r", encoding="utf-8") as f:
        return f.read()


def _load_backend_local_settings(root: Path) -> dict[str, str]:
    local_settings = root / "backend" / "src" / "Functions.Api" / "local.settings.json"
    if not local_settings.exists():
        return {}

    try:
        data = json.loads(local_settings.read_text(encoding="utf-8"))
    except Exception:
        return {}

    values = data.get("Values") if isinstance(data, dict) else None
    if not isinstance(values, dict):
        return {}

    return {str(k): str(v) for k, v in values.items()}


def _is_placeholder_endpoint(endpoint: str) -> bool:
    lowered = endpoint.strip().lower()
    return "<your-project>" in lowered or "<project-id>" in lowered or not lowered.startswith("https://")


def _validate_config(config: dict[str, Any], root: Path) -> list[str]:
    errors: list[str] = []

    for required in ["environment", "projectEndpoint", "modelDeployment", "agents"]:
        if required not in config:
            errors.append(f"Falta campo requerido: {required}")

    agents = config.get("agents")
    if not isinstance(agents, list) or not agents:
        errors.append("El campo agents debe ser una lista no vacia.")
        return errors

    for i, agent in enumerate(agents):
        if not isinstance(agent, dict):
            errors.append(f"agents[{i}] debe ser un objeto.")
            continue

        for field in ["key", "name", "instructionsFile", "backendSetting", "idSourceEnvVar"]:
            if not agent.get(field):
                errors.append(f"agents[{i}] falta campo requerido: {field}")

        instr = agent.get("instructionsFile")
        if isinstance(instr, str):
            instr_path = root / instr
            if not instr_path.exists():
                errors.append(f"No existe archivo de instrucciones: {instr_path}")

    return errors


def _collect_agent_runtime(config: dict[str, Any], root: Path) -> list[dict[str, Any]]:
    backend_local_settings = _load_backend_local_settings(root)
    agents: list[dict[str, Any]] = []
    for agent in config["agents"]:
        instr_path = root / agent["instructionsFile"]
        instructions = _read_text(instr_path)

        agent_id = os.getenv(agent["idSourceEnvVar"], "")
        if not agent_id:
            # Allow using backend variable names directly as a fallback source.
            agent_id = os.getenv(agent["backendSetting"], "")
        if not agent_id:
            agent_id = backend_local_settings.get(agent["backendSetting"], "")

        agents.append(
            {
                "key": agent["key"],
                "name": agent["name"],
                "backendSetting": agent["backendSetting"],
                "idSourceEnvVar": agent["idSourceEnvVar"],
                "instructionsFile": agent["instructionsFile"],
                "instructionsHash": str(abs(hash(instructions))),
                "memory": agent.get("memory", {}),
                "tags": agent.get("tags", []),
                "agentId": agent_id,
            }
        )

    return agents


def _ensure_dirs(root: Path, env: str) -> tuple[Path, Path, Path]:
    output_dir = root / "tools" / "foundry" / "output" / env
    infra_dir = root / "infra" / "parameters"
    backend_dir = root / "backend" / "src" / "Functions.Api"

    output_dir.mkdir(parents=True, exist_ok=True)
    infra_dir.mkdir(parents=True, exist_ok=True)
    backend_dir.mkdir(parents=True, exist_ok=True)

    return output_dir, infra_dir, backend_dir


def _build_export_payload(config: dict[str, Any], runtime_agents: list[dict[str, Any]]) -> dict[str, Any]:
    env = config["environment"]
    project_endpoint = config["projectEndpoint"]

    settings = {"FoundryAgent__ProjectEndpoint": project_endpoint}
    agent_ids: dict[str, str] = {}
    agent_names: dict[str, str] = {}
    memory_stores: dict[str, str] = {}

    for a in runtime_agents:
        settings[a["backendSetting"]] = a["agentId"]
        agent_ids[a["key"]] = a["agentId"]
        agent_names[a["key"]] = a["name"]
        mem = a.get("memory") or {}
        memory_stores[a["key"]] = mem.get("storeName", "")

    return {
        "environment": env,
        "projectEndpoint": project_endpoint,
        "modelDeployment": config["modelDeployment"],
        "agentIds": agent_ids,
        "agentNames": agent_names,
        "memoryStores": memory_stores,
        "settings": settings,
        "generatedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def _write_exports(root: Path, config: dict[str, Any], payload: dict[str, Any]) -> tuple[Path, Path, Path]:
    output_dir, infra_dir, backend_dir = _ensure_dirs(root, config["environment"])

    deployment_file = output_dir / "foundry-deployment.json"
    infra_file = infra_dir / f"foundry.{config['environment']}.json"
    backend_file = backend_dir / f"appsettings.foundry.{config['environment']}.json"

    deployment_file.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")

    infra_payload = {
        "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
        "contentVersion": "1.0.0.0",
        "parameters": {k: {"value": v} for k, v in payload["settings"].items()},
    }
    infra_file.write_text(json.dumps(infra_payload, indent=2, ensure_ascii=True), encoding="utf-8")

    backend_payload = {
        "FoundryAgent": {
            "ProjectEndpoint": payload["settings"].get("FoundryAgent__ProjectEndpoint", ""),
            "SqlPlannerAgentId": payload["settings"].get("FoundryAgent__SqlPlannerAgentId", ""),
            "ResultInterpreterAgentId": payload["settings"].get("FoundryAgent__ResultInterpreterAgentId", ""),
            "ConciergeAgentId": payload["settings"].get("FoundryAgent__ConciergeAgentId", ""),
            "VisualizationPlannerAgentId": payload["settings"].get("FoundryAgent__VisualizationPlannerAgentId", ""),
        },
        "GeneratedAtUtc": payload["generatedAtUtc"],
    }
    backend_file.write_text(json.dumps(backend_payload, indent=2, ensure_ascii=True), encoding="utf-8")

    return deployment_file, infra_file, backend_file


def _build_foundry_client(project_endpoint: str):
    from azure.ai.projects import AIProjectClient  # type: ignore
    from azure.identity import DefaultAzureCredential  # type: ignore

    return AIProjectClient(project_endpoint, DefaultAzureCredential())


def _list_agents_by_name(client, agent_name: str):
    matches = []
    for agent in client.agents.list_agents(limit=100):
        if getattr(agent, "name", None) == agent_name:
            matches.append(agent)
    return matches


def _upsert_prompt_agent(client, model_deployment: str, environment: str, agent_cfg: dict[str, Any], instructions: str) -> str:
    metadata = {
        "environment": environment,
        "key": agent_cfg["key"],
        "managedBy": "tools/foundry/deploy_agents.py",
        "instructionsHash": str(abs(hash(instructions))),
    }

    existing = _list_agents_by_name(client, agent_cfg["name"])
    if existing:
        current = existing[0]
        updated = client.agents.update_agent(
            current.id,
            model=model_deployment,
            name=agent_cfg["name"],
            instructions=instructions,
            temperature=agent_cfg.get("temperature"),
            top_p=agent_cfg.get("top_p"),
            metadata=metadata,
        )
        return updated.id

    created = client.agents.create_agent(
        model=model_deployment,
        name=agent_cfg["name"],
        instructions=instructions,
        temperature=agent_cfg.get("temperature"),
        top_p=agent_cfg.get("top_p"),
        metadata=metadata,
    )
    return created.id


def cmd_plan(args: argparse.Namespace) -> int:
    root = _repo_root()
    cfg_path = _resolve_config_path(root, args.env, args.config)
    config = _apply_overrides(_load_yaml(cfg_path), args)

    errors = _validate_config(config, root)
    if errors:
        print("Configuracion invalida:")
        for e in errors:
            print(f"- {e}")
        return 1

    runtime_agents = _collect_agent_runtime(config, root)

    print(f"Plan para entorno: {config['environment']}")
    print(f"Project endpoint: {config['projectEndpoint']}")
    print("")
    for a in runtime_agents:
        has_id = "si" if a["agentId"] else "no"
        print(f"- {a['key']} ({a['name']})")
        print(f"  instructions: {a['instructionsFile']}")
        print(f"  backend setting: {a['backendSetting']}")
        print(f"  agent id disponible en entorno: {has_id}")

    print("")
    print("Siguiente paso: ejecutar export para generar artefactos de configuracion.")
    return 0


def cmd_export(args: argparse.Namespace) -> int:
    root = _repo_root()
    cfg_path = _resolve_config_path(root, args.env, args.config)
    config = _apply_overrides(_load_yaml(cfg_path), args)

    errors = _validate_config(config, root)
    if errors:
        print("Configuracion invalida:")
        for e in errors:
            print(f"- {e}")
        return 1

    runtime_agents = _collect_agent_runtime(config, root)
    payload = _build_export_payload(config, runtime_agents)

    deployment_file, infra_file, backend_file = _write_exports(root, config, payload)

    print("Artefactos generados:")
    print(f"- {deployment_file.relative_to(root)}")
    print(f"- {infra_file.relative_to(root)}")
    print(f"- {backend_file.relative_to(root)}")
    return 0


def cmd_apply(_: argparse.Namespace) -> int:
    root = _repo_root()
    # argparse passes the namespace even if named _
    args = _
    cfg_path = _resolve_config_path(root, args.env, args.config)
    config = _apply_overrides(_load_yaml(cfg_path), args)

    errors = _validate_config(config, root)
    if errors:
        print("Configuracion invalida:")
        for e in errors:
            print(f"- {e}")
        return 1

    if _is_placeholder_endpoint(config["projectEndpoint"]):
        print("El projectEndpoint configurado es un placeholder. Actualiza tools/foundry/config/agents.<env>.yaml antes de usar apply.")
        return 1

    try:
        client = _build_foundry_client(config["projectEndpoint"])
    except Exception as exc:
        print(f"No fue posible crear el cliente de Foundry: {exc}")
        return 1

    runtime_agents = []
    for agent in config["agents"]:
        instructions = _read_text(root / agent["instructionsFile"])
        try:
            agent_id = _upsert_prompt_agent(
                client=client,
                model_deployment=config["modelDeployment"],
                environment=config["environment"],
                agent_cfg=agent,
                instructions=instructions,
            )
        except Exception as exc:
            print(f"Fallo al crear/actualizar {agent['key']} ({agent['name']}): {exc}")
            return 1

        runtime_agents.append(
            {
                "key": agent["key"],
                "name": agent["name"],
                "backendSetting": agent["backendSetting"],
                "idSourceEnvVar": agent["idSourceEnvVar"],
                "instructionsFile": agent["instructionsFile"],
                "instructionsHash": str(abs(hash(instructions))),
                "memory": agent.get("memory", {}),
                "tags": agent.get("tags", []),
                "agentId": agent_id,
            }
        )
        print(f"OK {agent['key']}: {agent_id}")

    payload = _build_export_payload(config, runtime_agents)
    deployment_file, infra_file, backend_file = _write_exports(root, config, payload)

    print("")
    print("Artefactos regenerados con IDs reales:")
    print(f"- {deployment_file.relative_to(root)}")
    print(f"- {infra_file.relative_to(root)}")
    print(f"- {backend_file.relative_to(root)}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="InsightForge Foundry agent deployment helper")
    sub = parser.add_subparsers(dest="command", required=True)

    p_plan = sub.add_parser("plan", help="Valida configuracion y muestra plan")
    p_plan.add_argument("--env", default="dev", help="Entorno objetivo (dev, qa, prod)")
    p_plan.add_argument("--config", help="Ruta explicita al archivo YAML de configuracion")
    p_plan.add_argument("--project-endpoint", help="Sobrescribe el project endpoint en tiempo de ejecucion")
    p_plan.add_argument("--model-deployment", help="Sobrescribe el deployment del modelo en tiempo de ejecucion")
    p_plan.add_argument("--environment-name", help="Sobrescribe el nombre de ambiente exportado")
    p_plan.set_defaults(func=cmd_plan)

    p_export = sub.add_parser("export", help="Genera artefactos para infra/backend")
    p_export.add_argument("--env", default="dev", help="Entorno objetivo (dev, qa, prod)")
    p_export.add_argument("--config", help="Ruta explicita al archivo YAML de configuracion")
    p_export.add_argument("--project-endpoint", help="Sobrescribe el project endpoint en tiempo de ejecucion")
    p_export.add_argument("--model-deployment", help="Sobrescribe el deployment del modelo en tiempo de ejecucion")
    p_export.add_argument("--environment-name", help="Sobrescribe el nombre de ambiente exportado")
    p_export.set_defaults(func=cmd_export)

    p_apply = sub.add_parser("apply", help="Placeholder para upsert de agentes en Foundry")
    p_apply.add_argument("--env", default="dev", help="Entorno objetivo (dev, qa, prod)")
    p_apply.add_argument("--config", help="Ruta explicita al archivo YAML de configuracion")
    p_apply.add_argument("--project-endpoint", help="Sobrescribe el project endpoint en tiempo de ejecucion")
    p_apply.add_argument("--model-deployment", help="Sobrescribe el deployment del modelo en tiempo de ejecucion")
    p_apply.add_argument("--environment-name", help="Sobrescribe el nombre de ambiente exportado")
    p_apply.set_defaults(func=cmd_apply)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
