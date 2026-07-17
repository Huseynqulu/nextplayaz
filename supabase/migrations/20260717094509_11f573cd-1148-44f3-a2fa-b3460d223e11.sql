
DELETE FROM public.home_categories;
INSERT INTO public.home_categories (title, subtitle, image_url, link_url, sort_order, active) VALUES
('PlayStation Oyunları', 'PS4 / PS5 oyunları', NULL, '/marketplace?platform=playstation', 1, true),
('PC Oyunları', 'Steam · Epic · GOG', NULL, '/marketplace?platform=pc', 2, true),
('Xbox Oyunları', 'Xbox One / Series', NULL, '/marketplace?platform=xbox', 3, true),
('PlayStation Hədiyyə Kartları', 'PSN Wallet', NULL, '/gift-cards?platform=playstation', 4, true),
('Steam Hədiyyə Kartları', 'Steam Wallet', NULL, '/gift-cards?platform=steam', 5, true),
('Xbox Hədiyyə Kartları', 'Xbox Wallet', NULL, '/gift-cards?platform=xbox', 6, true),
('Xbox Game Pass', 'Ultimate · PC', NULL, '/marketplace?platform=xbox-game-pass', 7, true),
('Lisenziya Xidmətləri', 'Netflix · Spotify · Adobe', NULL, '/marketplace?cat=Services', 8, true);
