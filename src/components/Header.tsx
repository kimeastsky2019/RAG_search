import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Upload, BarChart3, Settings, LogIn, LogOut, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";

const Header = () => {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsLoggedIn(!!token);
    }, []);

    const handleAuthAction = (action: () => void) => {
        const token = localStorage.getItem("token");
        if (token) {
            action();
        } else {
            navigate("/login");
        }
        setMobileMenuOpen(false);
    };

    const handleLogout = () => {
        api.logout();
        setIsLoggedIn(false);
        setMobileMenuOpen(false);
        toast.info("로그아웃되었습니다.");
        navigate("/");
    };

    const navItems = [
        { label: "검색", icon: Search, onClick: () => { navigate("/"); setMobileMenuOpen(false); } },
        { label: "업로드", icon: Upload, onClick: () => handleAuthAction(() => navigate("/upload")) },
        { label: "대시보드", icon: BarChart3, onClick: () => handleAuthAction(() => navigate("/dashboard")) },
        { label: "설정", icon: Settings, onClick: () => handleAuthAction(() => navigate("/settings")) },
    ];

    return (
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate("/")}>
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm border border-primary/10">
                            <img
                                src="/assets/gng-logo.png"
                                alt="Grok Ontology"
                                className="w-8 h-8 object-contain"
                            />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold gradient-text">Grok Ontology</h1>
                            <p className="text-sm text-muted-foreground">지능형 문서 검색 시스템</p>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-4">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Button
                                    key={item.label}
                                    variant="ghost"
                                    className="text-foreground hover:text-primary"
                                    onClick={item.onClick}
                                >
                                    <Icon className="w-4 h-4 mr-2" />
                                    {item.label}
                                </Button>
                            );
                        })}
                        {isLoggedIn ? (
                            <Button variant="outline" className="ml-2" onClick={handleLogout}>
                                <LogOut className="w-4 h-4 mr-2" />
                                로그아웃
                            </Button>
                        ) : (
                            <Button variant="default" className="ml-2" onClick={() => navigate("/login")}>
                                <LogIn className="w-4 h-4 mr-2" />
                                로그인
                            </Button>
                        )}
                    </nav>

                    {/* Mobile Menu Toggle */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="md:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </Button>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <nav className="md:hidden mt-4 pb-2 border-t pt-4 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Button
                                    key={item.label}
                                    variant="ghost"
                                    className="w-full justify-start text-foreground hover:text-primary"
                                    onClick={item.onClick}
                                >
                                    <Icon className="w-4 h-4 mr-2" />
                                    {item.label}
                                </Button>
                            );
                        })}
                        {isLoggedIn ? (
                            <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
                                <LogOut className="w-4 h-4 mr-2" />
                                로그아웃
                            </Button>
                        ) : (
                            <Button variant="default" className="w-full justify-start" onClick={() => { navigate("/login"); setMobileMenuOpen(false); }}>
                                <LogIn className="w-4 h-4 mr-2" />
                                로그인
                            </Button>
                        )}
                    </nav>
                )}
            </div>
        </header>
    );
};

export default Header;
